import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useVault } from "@/lib/vault-context";
export function LockSettings() {
  const { settings, updateSettings } = useVault();
  return <section className="settings-card"><label className="flex items-center justify-between gap-3">Auto lock after<Select value={String(settings.autoLockMin)} onValueChange={v => updateSettings({ autoLockMin: Number(v) })}><SelectTrigger className="w-32" aria-label="Auto lock after"><SelectValue /></SelectTrigger><SelectContent>{[1, 2, 5, 10, 30].map(m => <SelectItem key={m} value={String(m)}>{m} min</SelectItem>)}</SelectContent></Select></label>
  <label className="flex items-center justify-between gap-3">Lock on app switch<Switch aria-label="Lock on app switch" checked={false} disabled /></label><p className="text-sm text-muted-foreground">Paused for testing.</p></section>;
}
