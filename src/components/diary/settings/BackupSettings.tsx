import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { exportBackup } from "@/lib/storage/backup";
import { deliverBackup } from "@/lib/native/backup";
import { persistenceGranted, requestPersistence } from "@/lib/storage/persistence";
export function BackupSettings() {
  const [persisted, setPersisted] = useState<boolean | null>(null); const [backupBusy, setBackupBusy] = useState(false); const [notice, setNotice] = useState("");
  useEffect(() => { let active = true; persistenceGranted().then(v => { if (active) setPersisted(v); }); return () => { active = false; }; }, []);
  return <>        <section className="settings-card">
          <h2 className="font-medium">Encrypted backup</h2>
          <p className="text-sm text-muted-foreground">Storage protection: {persisted === null ? "Checking…" : persisted ? "Granted" : "Not granted"}. Clearing browser data or losing this phone can still erase your diary.</p>
          {!persisted && <Button variant="outline" onClick={async () => setPersisted(await requestPersistence())}>Request storage protection</Button>}
          <Button disabled={backupBusy} onClick={async () => {
            setBackupBusy(true); setNotice("");
            try {
              const blob = await exportBackup();
              setNotice(await deliverBackup(blob, `diary-encrypted-${new Date().toISOString().slice(0, 10)}-${Date.now()}.json`));
            } catch { setNotice("Backup could not be exported. Please try again."); }
            finally { setBackupBusy(false); }
          }}>{backupBusy ? "Exporting…" : "Export encrypted backup"}</Button>
          {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
        </section><section className="settings-card"><h2>Recovery phrase</h2><p className="text-sm">Your 12-word recovery phrase was shown when you created this diary. Keep that copy somewhere safe, separate from this device. It is not saved in the diary and cannot be displayed again.</p><p className="text-sm text-muted-foreground">Use it under Security to reset your passphrase. An encrypted backup alone cannot unlock your diary.</p></section></>;
}
