import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type React from "react";
import { encryptionOnlyKey, unlockWithPassphrase, resetPassphrase, type VaultMeta } from "@/lib/crypto/vault";
import {
  DEFAULT_SETTINGS,
  platformSettings,
  completeEntry,
  getSettings,
  getVaultMeta,
  listEntries,
  loadMedia,
  putEntry,
  putSettings,
  putVaultMeta,
  type Settings,
} from "@/lib/storage/db";
import { decodeToMono16k, transcribeAudio, type TranscribeProgress } from "@/lib/transcription";
import { requestPersistence } from "@/lib/storage/persistence";
import { defaultToneAnalyzer } from "@/lib/tone";
import { unlockUsingDevice, removeDeviceUnlock } from "@/lib/crypto/device";
import { unlockUsingPin, removePin } from "@/lib/crypto/pin";

type Status = "loading" | "setup" | "locked" | "unlocked";

type Ctx = {
  status: Status;
  key: CryptoKey | null;
  settings: Settings;
  version: number;
  progress: Record<string, TranscribeProgress>;
  bump: () => void;
  lock: () => void;
  unlock: (pass: string) => Promise<void>;
  unlockDevice: () => Promise<void>;
  unlockPin: (pin: string) => Promise<void>;
  recover: (phrase: string, newPass: string) => Promise<void>;
  finishSetup: (meta: VaultMeta, key: CryptoKey) => Promise<void>;
  updateSettings: (s: Partial<Settings>) => Promise<void>;
  setBusy: (b: boolean) => void;
};

// Keep one context object across hot reloads so an already-mounted provider still matches useVault.
const LOCK_ON_HIDE = false;
const g = globalThis as { __vaultCtx?: React.Context<Ctx | null> };
const VaultCtx = (g.__vaultCtx ??= createContext<Ctx | null>(null));

export function useVault() {
  const c = useContext(VaultCtx);
  if (!c) throw new Error("useVault outside provider");
  return c;
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [version, setVersion] = useState(0);
  const [progress, setProgress] = useState<Record<string, TranscribeProgress>>({});
  const keyRef = useRef<CryptoKey | null>(null);
  const busy = useRef(false);
  const lastActive = useRef(Date.now());
  const running = useRef(false);
  const pendingLock = useRef(false);
  const preparing = useRef(false);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    getVaultMeta().then((m) => setStatus(m ? "locked" : "setup"));
  }, []);

  const openWith = useCallback(async (k: CryptoKey) => {
    keyRef.current = k;
    setSettings(await getSettings(k));
    setKey(k);
    lastActive.current = Date.now();
    setStatus("unlocked");
    setVersion((v) => v + 1);
  }, []);

  const lock = useCallback(() => {
    if (busy.current || preparing.current) { pendingLock.current = true; return; }
    pendingLock.current = false;
    keyRef.current = null;
    setKey(null);
    setProgress({});
    setStatus("locked");
  }, []);

  const setBusy = useCallback((b: boolean) => {
    busy.current = b;
    if (!b && pendingLock.current) lock();
  }, [lock]);

  const unlock = useCallback(
    async (pass: string) => {
      const meta = await getVaultMeta();
      if (!meta) throw new Error("No diary found");
      await openWith(await unlockWithPassphrase(meta, pass));
    },
    [openWith],
  );

  const recover = useCallback(
    async (phrase: string, newPass: string) => {
      const meta = await getVaultMeta();
      if (!meta) throw new Error("No diary found");
      const r = await resetPassphrase(meta, phrase, newPass);
      await putVaultMeta(r.meta);
      await removeDeviceUnlock();
      await removePin();
      await openWith(r.key);
    },
    [openWith],
  );

  const finishSetup = useCallback(
    async (meta: VaultMeta, k: CryptoKey) => {
      await putVaultMeta(meta);
      await putSettings(k, platformSettings());
      await requestPersistence();
      await openWith(k);
    },
    [openWith],
  );

  const updateSettings = useCallback(
    async (s: Partial<Settings>) => {
      const k = keyRef.current;
      if (!k) return;
      const next = { ...settings, ...s };
      await putSettings(k, next);
      setSettings(next);
    },
    [settings],
  );

  // Auto-lock: inactivity and leaving the app (skipped while recording).
  useEffect(() => {
    if (status !== "unlocked") return;
    const touch = () => {
      lastActive.current = Date.now();
    };
    const onVis = () => {
      // TESTING PHASE: lock-on-app-switch paused. Set LOCK_ON_HIDE back to true before real use.
      if (LOCK_ON_HIDE && document.visibilityState === "hidden") lock();
    };
    const evs = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    evs.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    document.addEventListener("visibilitychange", onVis);
    const t = window.setInterval(() => {
      if (Date.now() - lastActive.current > settings.autoLockMin * 60_000) lock();
    }, 5000);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, touch));
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(t);
    };
  }, [status, settings.autoLockMin, lock]);

  // Background transcription queue.
  useEffect(() => {
    if (status !== "unlocked" || running.current) return;
    running.current = true;
    async function prepare() {
      const k = keyRef.current;
      if (!k) return null;
      preparing.current = true;
      try {
        const next = (await listEntries(k)).reverse().find((e) => e.status === "pending" || e.status === "transcribing");
        if (!next) return null;
        const entry = { ...next, status: "transcribing" as const };
        const revision = await putEntry(k, entry);
        const audio = await decodeToMono16k(await loadMedia(k, next));
        return { entry, revision, audio, writer: encryptionOnlyKey(k) };
      } finally {
        preparing.current = false;
        if (pendingLock.current) lock();
      }
    }
    (async () => {
      try {
        for (;;) {
          const job = await prepare();
          if (!job) return;
          setVersion((v) => v + 1);
          try {
            const segments = await transcribeAudio(job.audio, settings.whisperModel, (p) =>
              { if (keyRef.current) setProgress((m) => ({ ...m, [job.entry.id]: p })); },
            );
            await completeEntry(job.writer, { ...job.entry, status: "done", segments, error: undefined,
              toneNotes: defaultToneAnalyzer.analyze({ audio: job.audio, sampleRate: 16000, segments }) }, job.revision);
          } catch (err) {
            await completeEntry(job.writer, { ...job.entry, status: "error", error: err instanceof Error ? err.message : String(err) }, job.revision);
          } finally {
            job.audio.fill(0);
          }
          setProgress((m) => {
            const { [job.entry.id]: _, ...rest } = m;
            return rest;
          });
          setVersion((v) => v + 1);
        }
      } catch {
        // Storage/decode failures leave the queued entry retryable on next unlock.
      } finally {
        running.current = false;
      }
    })();
  }, [status, version, settings.whisperModel, lock]);

  return (
    <VaultCtx.Provider
      value={{
        status,
        key,
        settings,
        version,
        progress,
        bump,
        lock,
        unlock,
        unlockDevice: async () => { await openWith(await unlockUsingDevice()); },
        unlockPin: async (pin) => { await openWith(await unlockUsingPin(pin)); },
        recover,
        finishSetup,
        updateSettings,
        setBusy,
      }}
    >
      {children}
    </VaultCtx.Provider>
  );
}
