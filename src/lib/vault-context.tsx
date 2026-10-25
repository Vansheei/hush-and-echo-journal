import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { unlockWithPassphrase, resetPassphrase, type VaultMeta } from "@/lib/crypto/vault";
import {
  DEFAULT_SETTINGS,
  getEntry,
  getSettings,
  getVaultMeta,
  listEntries,
  loadMedia,
  putEntry,
  putSettings,
  putVaultMeta,
  type Settings,
} from "@/lib/storage/db";
import { transcribe, type TranscribeProgress } from "@/lib/transcription";

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
  recover: (phrase: string, newPass: string) => Promise<void>;
  finishSetup: (meta: VaultMeta, key: CryptoKey) => Promise<void>;
  updateSettings: (s: Partial<Settings>) => Promise<void>;
  setBusy: (b: boolean) => void;
};

const VaultCtx = createContext<Ctx | null>(null);

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
    keyRef.current = null;
    setKey(null);
    setProgress({});
    setStatus("locked");
  }, []);

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
      await openWith(r.key);
    },
    [openWith],
  );

  const finishSetup = useCallback(
    async (meta: VaultMeta, k: CryptoKey) => {
      await putVaultMeta(meta);
      await putSettings(k, DEFAULT_SETTINGS);
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
      if (document.visibilityState === "hidden" && !busy.current) lock();
    };
    const evs = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    evs.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    document.addEventListener("visibilitychange", onVis);
    const t = window.setInterval(() => {
      if (busy.current) {
        touch();
        return;
      }
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
    const k = keyRef.current;
    if (!k) return;
    running.current = true;
    (async () => {
      try {
        for (;;) {
          if (keyRef.current !== k) return;
          const next = (await listEntries(k))
            .reverse()
            .find((e) => e.status === "pending" || e.status === "transcribing");
          if (!next) return;
          await putEntry(k, { ...next, status: "transcribing" });
          setVersion((v) => v + 1);
          try {
            const blob = await loadMedia(k, next);
            const segments = await transcribe(blob, settings.whisperModel, (p) =>
              setProgress((m) => ({ ...m, [next.id]: p })),
            );
            if (keyRef.current !== k) return;
            const cur = await getEntry(k, next.id);
            if (cur) await putEntry(k, { ...cur, status: "done", segments, error: undefined });
          } catch (err) {
            if (keyRef.current !== k) return;
            const cur = await getEntry(k, next.id);
            if (cur)
              await putEntry(k, { ...cur, status: "error", error: err instanceof Error ? err.message : String(err) });
          }
          setProgress((m) => {
            const { [next.id]: _, ...rest } = m;
            return rest;
          });
          setVersion((v) => v + 1);
        }
      } finally {
        running.current = false;
      }
    })();
  }, [status, version, settings.whisperModel]);

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
        recover,
        finishSetup,
        updateSettings,
        setBusy: (b) => (busy.current = b),
      }}
    >
      {children}
    </VaultCtx.Provider>
  );
}
