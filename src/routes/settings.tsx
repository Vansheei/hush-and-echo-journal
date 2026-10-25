import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/diary/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changePassphrase } from "@/lib/crypto/vault";
import { getApiKey, putApiKey, getVaultMeta, putVaultMeta, type WhisperModel } from "@/lib/storage/db";
import { useVault } from "@/lib/vault-context";
import { exportBackup } from "@/lib/storage/backup";
import { persistenceGranted, requestPersistence } from "@/lib/storage/persistence";
import { FEATURES, MODELS, type ModelChoice } from "@/lib/ai/models";
import { useAppearance, setAppearance, type Cover } from "@/lib/appearance";
import { BookCover } from "@/components/diary/BookCover";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Diary — Settings" },
      { name: "description", content: "Lock, transcription and passphrase settings." },
      { property: "og:title", content: "Diary — Settings" },
      { property: "og:description", content: "Lock, transcription and passphrase settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const LOCKS = [1, 2, 5, 10, 30];

function SettingsPage() {
  const { key, settings, updateSettings, lock } = useVault();
  const look = useAppearance();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [api, setApi] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [ack, setAck] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    persistenceGranted().then((v) => { if (active) setPersisted(v); });
    if (key) getApiKey(key).then((v) => { if (active) setHasKey(!!v); });
    return () => { active = false; };
  }, [key]);
  const [oldP, setOldP] = useState("");
  const [newP, setNewP] = useState("");
  const [msg, setMsg] = useState("");

  async function change() {
    setMsg("");
    if (newP.length < 8) return setMsg("Use at least 8 characters.");
    const meta = await getVaultMeta();
    if (!meta) return;
    try {
      await putVaultMeta(await changePassphrase(meta, oldP, newP));
      setOldP("");
      setNewP("");
      setMsg("Passphrase changed.");
    } catch {
      setMsg("Current passphrase is wrong.");
    }
  }

  return (
    <div className="app-shell">
      <AppHeader back title="Settings" />
      <main className="space-y-6 px-4 pb-16">
        <section className="settings-card">
          <h2>Cover</h2>
          <p className="text-sm text-muted-foreground">{look.coverChosen ? "The other colour is used for the ribbon and glows." : "Choose your cover. The other colour becomes the ribbon and glows."}</p>
          <div className="grid grid-cols-2 gap-3">
            {(["green", "plum"] as Cover[]).map((c) => (
              <button key={c} data-cover={c} aria-pressed={look.cover === c} onClick={() => setAppearance({ cover: c, coverChosen: true })}
                className={`space-y-2 rounded-md p-2 text-center ${look.cover === c ? "ring-2 ring-gold" : ""}`}>
                <div className="pointer-events-none origin-top scale-100"><BookCover /></div>
                <span className="text-sm">{c === "green" ? "Bottle green" : "Plum"}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="settings-card">
          <h2>Sounds</h2>
          <label className="flex items-center justify-between gap-3 text-sm">Page turn, cassette click and lock sound<Switch checked={look.sounds} onCheckedChange={(v) => setAppearance({ sounds: v })} /></label>
        </section>
        <section className="settings-card">
          <h2 className="font-medium">Encrypted backup</h2>
          <p className="text-sm text-muted-foreground">Storage protection: {persisted === null ? "Checking…" : persisted ? "Granted" : "Not granted"}. Clearing browser data or losing this phone can still erase your diary.</p>
          {!persisted && <Button variant="outline" onClick={async () => setPersisted(await requestPersistence())}>Request storage protection</Button>}
          <Button disabled={backupBusy} onClick={async () => {
            setBackupBusy(true); setNotice("");
            try {
              const blob = await exportBackup();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = `diary-encrypted-${new Date().toISOString().slice(0, 10)}.json`;
              document.body.appendChild(a); a.click(); a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 60_000);
              setNotice("Backup download started. Check your downloads and keep it outside this browser. Use the passphrase or recovery phrase valid today.");
            } catch { setNotice("Backup could not be exported. Please try again."); }
            finally { setBackupBusy(false); }
          }}>{backupBusy ? "Exporting…" : "Export encrypted backup"}</Button>
          {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
        </section>
        <section className="settings-card">
          <h2 className="font-medium">Default: listen or reflect</h2>
          <div className="flex gap-2">{(["listen", "reflect"] as const).map((mode) => <Button key={mode} variant={settings.mode === mode ? "default" : "outline"} onClick={() => updateSettings({ mode })}>{mode === "listen" ? "Listen" : "Reflect"}</Button>)}</div>
        </section>
        <section className="settings-card">
          <h2 className="font-medium">Anthropic key</h2>
          <p className="text-sm text-muted-foreground">{hasKey ? "Key saved ••••••••" : "No key saved"}</p>
          <Input type="password" autoComplete="off" aria-label="Anthropic API key" placeholder="Paste your key" value={api} onChange={(e) => setApi(e.target.value)} />
          <label className="flex items-start gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />I understand the key is encrypted while saved, but available to this browser during Claude requests. A compromised device or script could access it.</label>
          <div className="flex gap-2"><Button disabled={!api.trim() || !ack} onClick={async () => { if (!key) return; try { await putApiKey(key, api.trim()); setApi(""); setAck(false); setHasKey(true); } catch { setNotice("Could not save the key."); } }}>Save key</Button>
          {hasKey && <Button variant="outline" onClick={async () => { if (key) { await putApiKey(key, ""); setHasKey(false); } }}>Remove key</Button>}</div>
        </section>
        <section className="settings-card">
          <h2 className="font-medium">Claude models</h2>
          {FEATURES.map((feature) => <label key={feature} className="flex items-center justify-between gap-3 text-sm"><span className="capitalize">{feature}</span>
            <Select value={settings.models[feature]} onValueChange={(v) => updateSettings({ models: { ...settings.models, [feature]: v as ModelChoice } })}>
              <SelectTrigger className="w-48" aria-label={`${feature} model`}><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(MODELS).map(([v, m]) => <SelectItem key={v} value={v}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </label>)}
        </section>
        <section className="settings-card">
          <h2 className="font-medium">Transcription model</h2>
          <p className="text-sm text-muted-foreground">Runs on this phone. Downloaded once, then works offline.</p>
          {(
            [
              ["base", "Base", "Faster, ~80 MB"],
              ["small", "Small", "More accurate, ~250 MB"],
            ] as [WhisperModel, string, string][]
          ).map(([v, l, d]) => (
            <label key={v} className="flex items-center gap-3 py-1">
              <input
                type="radio"
                name="model"
                checked={settings.whisperModel === v}
                onChange={() => updateSettings({ whisperModel: v })}
              />
              <span className="flex-1">{l}</span>
              <span className="text-sm text-muted-foreground">{d}</span>
            </label>
          ))}
        </section>

        <section className="settings-card">
          <h2 className="font-medium">Auto-lock after</h2>
          <div className="flex flex-wrap gap-2">
            {LOCKS.map((m) => (
              <Button
                key={m}
                size="sm"
                variant={settings.autoLockMin === m ? "default" : "outline"}
                onClick={() => updateSettings({ autoLockMin: m })}
              >
                {m} min
              </Button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">The diary also locks when you leave the app.</p>
          <Button variant="secondary" onClick={lock}>
            Lock now
          </Button>
        </section>

        <section className="settings-card">
          <h2 className="font-medium">Change passphrase</h2>
          <Input type="password" placeholder="Current passphrase" value={oldP} onChange={(e) => setOldP(e.target.value)} />
          <Input type="password" placeholder="New passphrase" value={newP} onChange={(e) => setNewP(e.target.value)} />
          {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
          <Button onClick={change} disabled={!oldP || !newP}>
            Change
          </Button>
        </section>

        <p className="text-center text-sm text-muted-foreground">
          Companion chat and Google Drive sync arrive in later phases.
        </p>
      </main>
    </div>
  );
}
