import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useAppearance, setAppearance } from "@/lib/appearance";
export function SoundSettings() {
  const look = useAppearance();
  return <section className="settings-card">
    <label className="flex items-center justify-between gap-3">Page turn sound<Switch aria-label="Page turn sound" checked={look.sounds} onCheckedChange={sounds => setAppearance({ sounds })} /></label>
    <label className="flex items-center justify-between gap-3">Read replies aloud<Switch aria-label="Read replies aloud" checked={look.readRepliesAloud} onCheckedChange={readRepliesAloud => setAppearance({ readRepliesAloud })} /></label>
    <label className="flex items-center justify-between gap-3">Companion voice speed<Input className="w-24" aria-label="Companion voice speed" type="number" min={0.5} max={2} step={0.05} value={look.companionVoiceSpeed} onChange={e => { const speed = Number(e.target.value); if (Number.isFinite(speed) && speed >= 0.5 && speed <= 2) setAppearance({ companionVoiceSpeed: speed }); }} /></label>
  </section>;
}
