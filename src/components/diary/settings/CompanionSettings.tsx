import { t, useLanguage } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getApiKey, putApiKey, type WhisperModel } from "@/lib/storage/db";
import { FEATURES, MODELS, type ModelChoice } from "@/lib/ai/models";
import { getKeyTest, keySummary, sanitizeKey, setKeyTest, testKey, type KeyTest } from "@/lib/ai/key";
import { useVault } from "@/lib/vault-context";
import { isNativeAndroid } from "@/lib/native/platform";

type Summary = ReturnType<typeof keySummary>;
const READY: [string, "companion" | "reflection" | "recap"][] = [["Night Companion", "companion"], ["Reflections", "reflection"], ["The Week's Tale", "recap"]];

export function CompanionSettings() {
  useLanguage();
  const { key, settings, updateSettings } = useVault();
  const [api, setApi] = useState(""); const [summary, setSummary] = useState<Summary | null>(null); const [ack, setAck] = useState(false);
  const [notice, setNotice] = useState(""); const [test, setTest] = useState<KeyTest | null>(() => getKeyTest()); const [testing, setTesting] = useState(false);
  const refresh = async () => { if (!key) return; try { const v = await getApiKey(key); setSummary(v ? keySummary(v) : null); } catch { setNotice("Could not check your saved key."); } };
  useEffect(() => { void refresh(); }, [key]);
  const pasted = api ? sanitizeKey(api) : null;

  async function runTest() {
    if (!key) return;
    const saved = await getApiKey(key);
    if (!saved) return;
    if (!window.confirm(t("Send one tiny test message (\"Reply with OK\") to Anthropic? No diary content is sent."))) return;
    setTesting(true);
    const models = Array.from(new Set(READY.map(([, f]) => settings.models[f])));
    let result: KeyTest = { ok: true, at: Date.now(), models };
    for (const m of models) { const r = await testKey(saved, m); if (!r.ok) { result = { ok: false, at: Date.now(), error: `${MODELS[m].label}: ${r.error}`, models }; break; } }
    setKeyTest(result); setTest(result); setTesting(false);
  }

  const step = !summary ? 1 : !test ? 2 : test.ok ? 3 : 2;
  return <>
    <section className="settings-card">
      <h2 className="font-medium">{t("Anthropic key setup")}</h2>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li className={step === 1 ? "text-foreground" : ""}>{t("Paste your key from console.anthropic.com → API keys. It starts with sk-ant-.")}</li>
        <li className={step === 2 ? "text-foreground" : ""}>{t("Tap Test key to check it with Anthropic.")}</li>
        <li className={step === 3 ? "text-foreground" : ""}>{t("When the test passes, the features below are ready.")}</li>
      </ol>
      {summary ? <div className="space-y-1 rounded border border-border p-2 text-sm" aria-label={t("Saved key check")}>
        <p>{t("Saved key")}: <span className="font-mono">{summary.start}…{summary.end}</span></p>
        <p>{t("Characters")}: {summary.length} · {t("Hidden characters")}: {summary.hidden ? t("yes") : t("no")}</p>
      </div> : <p className="text-sm text-muted-foreground">{t("No key saved")}</p>}
      <Input type="password" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} data-lpignore="true" aria-label={t("Anthropic API key")} placeholder={t("Paste your key")} value={api} onChange={(e) => setApi(e.target.value)} />
      {pasted?.changed && !pasted.problem && <p className="text-sm text-muted-foreground">{t("Hidden spaces or characters were removed from what you pasted.")}</p>}
      {pasted?.problem && <p role="alert" className="text-sm text-destructive">{t(pasted.problem)}</p>}
      <label className="flex items-start gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />{t("I understand the key is encrypted while saved, but available to this browser during Claude requests. A compromised device or script could access it.")}</label>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!pasted || !!pasted.problem || !ack} onClick={async () => { if (!key || !pasted) return; try { await putApiKey(key, pasted.key); setApi(""); setAck(false); setKeyTest(null); setTest(null); await refresh(); } catch { setNotice("Could not save the key."); } }}>{t("Save key")}</Button>
        {summary && <Button variant="outline" disabled={testing} onClick={() => void runTest()}>{testing ? t("Testing…") : t("Test key")}</Button>}
        {summary && <Button variant="ghost" onClick={async () => { if (key) { await putApiKey(key, ""); setSummary(null); setKeyTest(null); setTest(null); } }}>{t("Remove key")}</Button>}
      </div>
      {test && !test.ok && <p role="alert" className="break-words text-sm text-destructive">{test.error}</p>}
    </section>
    <section className="settings-card">
      <h2 className="font-medium">{t("Ready to use")}</h2>
      {READY.map(([label, f]) => {
        const ok = !!summary && !!test?.ok && test.models.includes(settings.models[f]);
        const why = !summary ? t("No key saved") : !test ? t("Key not tested yet") : !test.ok ? t("Key test failed") : !ok ? t("Test again after changing the model") : t("Ready");
        return <p key={f} className="flex items-center justify-between gap-3 text-sm"><span>{t(label)} · {MODELS[settings.models[f]].label}</span><span className={ok ? "" : "text-muted-foreground"}>{ok ? "✓ " : "○ "}{why}</span></p>;
      })}
    </section>
    <section className="settings-card">
      <h2 className="font-medium">{t("Claude models")}</h2>
      {FEATURES.map((feature) => <label key={feature} className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="capitalize">{t(feature)}</span>
        <Select value={settings.models[feature]} onValueChange={(v) => updateSettings({ models: { ...settings.models, [feature]: v as ModelChoice } })}>
          <SelectTrigger className="w-48" aria-label={`${t(feature)} · ${t("Claude models")}`}><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(MODELS).map(([v, m]) => <SelectItem key={v} value={v}>{m.label}</SelectItem>)}</SelectContent>
        </Select>
      </label>)}
    </section>
    <section className="settings-card">
      <h2 className="font-medium">{t("Transcription model")}</h2>
      <p className="text-sm text-muted-foreground">{t("Multilingual · automatic language detection · no translation. Model files stay on this phone unless browser storage is cleared or evicted.")}</p>
      {(
        [
          ["tiny", "Multilingual tiny", isNativeAndroid() ? "Android default · fastest, least accurate" : "Fastest, least accurate"],
          ["base", "Multilingual base", isNativeAndroid() ? "Around three times slower than tiny" : "Lighter download"],
          ["small", "Multilingual small", isNativeAndroid() ? "Slowest on a phone · most accurate" : "Default · more accurate"],
        ] as [WhisperModel, string, string][]
      ).map(([v, l, d]) => (
        <label key={v} className="flex items-center gap-3 py-1">
          <input type="radio" name="model" checked={settings.whisperModel === v} onChange={() => updateSettings({ whisperModel: v, whisperModelChosen: true })} />
          <span className="flex-1">{t(l)}</span>
          <span className="max-w-[45%] text-sm text-muted-foreground">{t(d)}</span>
        </label>
      ))}
    </section>
    {notice && <p role="status">{t(notice)}</p>}
  </>;
}
