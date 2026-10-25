import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deviceUnlockAvailable, enableDeviceUnlock, getDeviceWrap, removeDeviceUnlock } from "@/lib/crypto/device";
import { getVaultMeta } from "@/lib/storage/db";
import { useVault } from "@/lib/vault-context";

export function DeviceUnlockSettings() {
  const { setBusy, version } = useVault();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [pass, setPass] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { let active = true; Promise.all([deviceUnlockAvailable(), getDeviceWrap()]).then(([a, w]) => {
    if (active) { setAvailable(a); setEnabled(!!w); }
  }); return () => { active = false; }; }, [version]);
  async function enable() {
    setWorking(true); setBusy(true); setMessage("");
    try {
      const meta = await getVaultMeta();
      if (!meta) throw new Error("No diary found.");
      await enableDeviceUnlock(meta, pass);
      setEnabled(true); setMessage("Device unlock enabled. Your passphrase and recovery phrase still work.");
    } catch (error) {
      setMessage(error instanceof DOMException && error.name === "NotAllowedError" ? "The browser or device refused the request, or it was cancelled. Try opening the diary directly in Chrome rather than inside a preview. Secure passkey encryption must be supported; your passphrase still works." : error instanceof Error ? error.message : "Could not enable device unlock.");
    } finally { setPass(""); setWorking(false); setBusy(false); }
  }
  return <div className="space-y-3 border-t border-border pt-4">
    <h3 className="flex items-center gap-2 font-display text-3xl"><Fingerprint className="size-5" />Fingerprint unlock</h3>
    <p className="text-sm text-muted-foreground">Your device verifies you; the diary never receives your fingerprint. It may offer face recognition or your device PIN instead. Available only in supported browsers on this device and site.</p>
    <p role="status" className="text-sm">{enabled ? "Enabled" : available === null ? "Checking device…" : available ? "Not enabled" : "Unavailable here — use your passphrase."}</p>
    {!enabled && available && <>
      <Input type="password" autoComplete="off" aria-label="Passphrase for fingerprint setup" placeholder="Current passphrase" value={pass} onChange={(e) => setPass(e.target.value)} />
      <Button disabled={working || !pass} onClick={() => void enable()}><Fingerprint />{working ? "Waiting for device…" : "Enable fingerprint unlock"}</Button>
    </>}
    {enabled && <Button variant="outline" disabled={working} onClick={async () => {
      await removeDeviceUnlock(); setEnabled(false); setMessage("Diary device unlock removed. You can remove its passkey in your device settings too.");
    }}>Disable fingerprint unlock</Button>}
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
  </div>;
}