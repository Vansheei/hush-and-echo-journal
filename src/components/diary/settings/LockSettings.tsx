import { t, useLanguage } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useVault } from "@/lib/vault-context";
import { setAppearance, useAppearance } from "@/lib/appearance";
import { hasPin } from "@/lib/crypto/pin";
import { getDeviceWrap } from "@/lib/crypto/device";
export function LockSettings() {
  useLanguage();
  const { settings, updateSettings } = useVault();
  const look = useAppearance();
  const [canHide, setCanHide] = useState(false);
  useEffect(() => { let active = true; Promise.all([hasPin(), getDeviceWrap()]).then(([p, d]) => { if (active) setCanHide(p || !!d); }); return () => { active = false; }; }, []);
  return <section className="settings-card"><label className="flex items-center justify-between gap-3">{t("Auto lock after")}<Select value={String(settings.autoLockMin)} onValueChange={v => updateSettings({ autoLockMin: Number(v) })}><SelectTrigger className="w-32" aria-label={t("Auto lock after")}><SelectValue /></SelectTrigger><SelectContent>{[1, 2, 5, 10, 30].map(m => <SelectItem key={m} value={String(m)}>{m} {t("min")}</SelectItem>)}</SelectContent></Select></label>
  <label className="flex items-center justify-between gap-3">{t("Lock on app switch")}<Switch aria-label={t("Lock on app switch")} checked={false} disabled /></label><p className="text-sm text-muted-foreground">{t("Paused for testing.")}</p>
  <label className="flex items-center justify-between gap-3">{t("Hide passphrase on lock screen")}<Switch aria-label={t("Hide passphrase on lock screen")} checked={look.hidePassphrase && canHide} disabled={!canHide} onCheckedChange={v => setAppearance({ hidePassphrase: v })} /></label>
  <p className="text-sm text-muted-foreground">{canHide ? t("Fingerprint or PIN opens the diary. The passphrase still works via \"Use passphrase\" and is still needed for backups and reset.") : t("Set up fingerprint unlock or a diary PIN first.")}</p>
  <label className="flex items-center justify-between gap-3">{t("Always send to Claude without confirming")}<Switch aria-label={t("Always send to Claude without confirming")} checked={look.alwaysSend} onCheckedChange={v => setAppearance({ alwaysSend: v })} /></label>
  <p className="text-sm text-muted-foreground">{t("Reflections and companion turns go straight through, with no preview to confirm. Only transcript text ever leaves the device; audio and video never do.")}</p></section>;
}
