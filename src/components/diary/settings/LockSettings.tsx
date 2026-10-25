import { t, useLanguage } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useVault } from "@/lib/vault-context";
export function LockSettings() {
  useLanguage();
  const { settings, updateSettings } = useVault();
  return <section className="settings-card"><label className="flex items-center justify-between gap-3">{t("Auto lock after")}<Select value={String(settings.autoLockMin)} onValueChange={v => updateSettings({ autoLockMin: Number(v) })}><SelectTrigger className="w-32" aria-label={t("Auto lock after")}><SelectValue /></SelectTrigger><SelectContent>{[1, 2, 5, 10, 30].map(m => <SelectItem key={m} value={String(m)}>{m} {t("min")}</SelectItem>)}</SelectContent></Select></label>
  <label className="flex items-center justify-between gap-3">{t("Lock on app switch")}<Switch aria-label={t("Lock on app switch")} checked={false} disabled /></label><p className="text-sm text-muted-foreground">{t("Paused for testing.")}</p></section>;
}
