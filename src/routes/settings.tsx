import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/diary/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changePassphrase } from "@/lib/crypto/vault";
import { getVaultMeta, putVaultMeta, type WhisperModel } from "@/lib/storage/db";
import { useVault } from "@/lib/vault-context";

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
  const { settings, updateSettings, lock } = useVault();
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
          AI companion, API key and backups arrive in later phases.
        </p>
      </main>
    </div>
  );
}
