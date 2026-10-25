import { t, useLanguage } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { DeviceUnlockSettings } from "./DeviceUnlockSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { enablePin, hasPin, removePin } from "@/lib/crypto/pin";
import { useVault } from "@/lib/vault-context";

export function SecuritySettings() {
  useLanguage();
  const { recover, setBusy } = useVault();
  const [enabled, setEnabled] = useState(false);
  const [pass, setPass] = useState(""); const [pin, setPin] = useState(""); const [repeat, setRepeat] = useState("");
  const [phrase, setPhrase] = useState(""); const [next, setNext] = useState(""); const [again, setAgain] = useState("");
  const [working, setWorking] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => { let active = true; hasPin().then(v => { if (active) setEnabled(v); }); return () => { active = false; }; }, []);
  async function run(action: () => Promise<void>) {
    setWorking(true); setBusy(true); setMessage("");
    try { await action(); } catch(e) { setMessage(e instanceof Error ? e.message : "Could not update security."); }
    finally { setWorking(false); setBusy(false); setPass(""); setPin(""); setRepeat(""); setPhrase(""); setNext(""); setAgain(""); }
  }
  return <section className="settings-card">
    <DeviceUnlockSettings />
    <div className="space-y-3 border-t border-border pt-4">
      <h3 className="font-display text-3xl">{t("Diary PIN")}</h3>
      <p className="text-sm text-muted-foreground">{t("Optional, 6–12 digits. A PIN is easier to guess than a strong passphrase if someone copies your encrypted diary. It is not your phone’s PIN.")}</p>
      {enabled ? <Button variant="outline" disabled={working} onClick={() => void run(async () => { await removePin(); setEnabled(false); setMessage("Diary PIN removed."); })}>{t("Remove diary PIN")}</Button> : <>
        <Input aria-label={t("Passphrase for PIN setup")} type="password" autoComplete="off" placeholder={t("Current passphrase")} value={pass} onChange={e => setPass(e.target.value)} />
        <Input aria-label={t("New diary PIN")} type="password" inputMode="numeric" maxLength={12} placeholder={t("New diary PIN")} value={pin} onChange={e => setPin(e.target.value)} />
        <Input aria-label={t("Repeat diary PIN")} type="password" inputMode="numeric" maxLength={12} placeholder={t("Repeat diary PIN")} value={repeat} onChange={e => setRepeat(e.target.value)} />
        <Button disabled={working || !pass || !pin || !repeat} onClick={() => void run(async () => {
          if (pin !== repeat) throw new Error("PINs don’t match.");
          await enablePin(pass, pin); setEnabled(true); setMessage("Diary PIN enabled.");
        })}>{t("Set diary PIN")}</Button>
      </>}
    </div>
    <div className="space-y-3 border-t border-border pt-4">
      <h3 className="font-display text-3xl">{t("Reset passphrase")}</h3>
      <p className="text-sm text-muted-foreground">{t("Use your recovery phrase. Resetting removes diary PIN and fingerprint unlock; entries stay encrypted and readable.")}</p>
      <Textarea aria-label={t("Recovery phrase for reset")} placeholder={t("12-word recovery phrase")} autoCapitalize="none" value={phrase} onChange={e => setPhrase(e.target.value)} />
      <Input aria-label={t("New passphrase for reset")} type="password" placeholder={t("New passphrase")} value={next} onChange={e => setNext(e.target.value)} />
      <Input aria-label={t("Repeat passphrase for reset")} type="password" placeholder={t("Repeat new passphrase")} value={again} onChange={e => setAgain(e.target.value)} />
      <Button disabled={working || !phrase || !next || !again} onClick={() => void run(async () => {
        if (next.length < 8) throw new Error("Use at least 8 characters.");
        if (next !== again) throw new Error("Passphrases don’t match.");
        await recover(phrase, next); setEnabled(false); setMessage("Passphrase reset. Set up fingerprint or PIN again if wanted.");
      })}>{t("Reset passphrase")}</Button>
    </div>
    {message && <p role="status" className="text-sm">{t(message)}</p>}
  </section>;
}