import { t, useLanguage } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getApiKey, putApiKey, type WhisperModel } from "@/lib/storage/db";
import { FEATURES, MODELS, type ModelChoice } from "@/lib/ai/models";
import { useVault } from "@/lib/vault-context";
import { isNativeAndroid } from "@/lib/native/platform";
export function CompanionSettings() {
  useLanguage();
  const { key, settings, updateSettings } = useVault();
  const [api, setApi] = useState(""); const [hasKey, setHasKey] = useState(false); const [ack, setAck] = useState(false); const [notice, setNotice] = useState("");
  useEffect(() => { let active = true; if (key) getApiKey(key).then(v => { if (active) setHasKey(!!v); }).catch(() => { if (active) setNotice("Could not check your saved key."); }); return () => { active = false; }; }, [key]);
  return <>        <section className="settings-card">
          <h2 className="font-medium">{t("Anthropic key")}</h2>
          <p className="text-sm text-muted-foreground">{hasKey ? t("Key saved ••••••••") : t("No key saved")}</p>
          <Input type="password" autoComplete="off" aria-label={t("Anthropic API key")} placeholder={t("Paste your key")} value={api} onChange={(e) => setApi(e.target.value)} />
          <label className="flex items-start gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />{t("I understand the key is encrypted while saved, but available to this browser during Claude requests. A compromised device or script could access it.")}</label>
          <div className="flex gap-2"><Button disabled={!api.trim() || !ack} onClick={async () => { if (!key) return; try { await putApiKey(key, api.trim()); setApi(""); setAck(false); setHasKey(true); } catch { setNotice("Could not save the key."); } }}>{t("Save key")}</Button>
          {hasKey && <Button variant="outline" onClick={async () => { if (key) { await putApiKey(key, ""); setHasKey(false); } }}>{t("Remove key")}</Button>}</div>
        </section>
        <section className="settings-card">
          <h2 className="font-medium">{t("Claude models")}</h2>
          {FEATURES.map((feature) => <label key={t(feature)} className="flex items-center justify-between gap-3 text-sm"><span className="capitalize">{t(feature)}</span>
            <Select value={settings.models[feature]} onValueChange={(v) => updateSettings({ models: { ...settings.models, [feature]: v as ModelChoice } })}>
              <SelectTrigger className="w-48" aria-label={`${feature} model`}><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(MODELS).map(([v, m]) => <SelectItem key={v} value={v}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </label>)}
        </section>
        <section className="settings-card">
          <h2 className="font-medium">{t("Transcription model")}</h2>
          <p className="text-sm text-muted-foreground">{t("Multilingual · automatic language detection · no translation. Model files stay on this phone unless browser storage is cleared or evicted.")}</p>
          {(
            [
              ["base", "Multilingual base", isNativeAndroid() ? "Android default · faster, slightly less accurate" : "Lighter download"],
              ["small", "Multilingual small", isNativeAndroid() ? "Slower · more accurate" : "Default · more accurate"],
            ] as [WhisperModel, string, string][]
          ).map(([v, l, d]) => (
            <label key={v} className="flex items-center gap-3 py-1">
              <input
                type="radio"
                name="model"
                checked={settings.whisperModel === v}
                onChange={() => updateSettings({ whisperModel: v, whisperModelChosen: true })}
              />
              <span className="flex-1">{t(l)}</span>
              <span className="max-w-[45%] text-sm text-muted-foreground">{t(d)}</span>
            </label>
          ))}
        </section>
{notice && <p role="status">{t(notice)}</p>}</>;
}
