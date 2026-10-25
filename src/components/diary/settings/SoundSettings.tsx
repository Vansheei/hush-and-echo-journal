import { t, useLanguage } from "@/lib/i18n";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useAppearance, setAppearance } from "@/lib/appearance";
export function SoundSettings() {
  useLanguage();
  const look = useAppearance();
  return <section className="settings-card">
    <label className="flex items-center justify-between gap-3">{t("Page turn sound")}<Switch aria-label={t("Page turn sound")} checked={look.sounds} onCheckedChange={sounds => setAppearance({ sounds })} /></label>
    <label className="flex items-center justify-between gap-3">{t("Read replies aloud")}<Switch aria-label={t("Read replies aloud")} checked={look.readRepliesAloud} onCheckedChange={readRepliesAloud => setAppearance({ readRepliesAloud })} /></label>
    <label className="flex items-center justify-between gap-3">{t("Companion voice speed")}<Input className="w-24" aria-label={t("Companion voice speed")} type="number" min={0.5} max={2} step={0.05} value={look.companionVoiceSpeed} onChange={e => { const speed = Number(e.target.value); if (Number.isFinite(speed) && speed >= 0.5 && speed <= 2) setAppearance({ companionVoiceSpeed: speed }); }} /></label>
  </section>;
}
