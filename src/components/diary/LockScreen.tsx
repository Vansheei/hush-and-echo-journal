import { t, useLanguage } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useVault } from "@/lib/vault-context";
import { touchPoint, useAppearance } from "@/lib/appearance";
import { passphraseHidden } from "@/lib/lock-options";
import { BookCover } from "./BookCover";
import { getDeviceWrap } from "@/lib/crypto/device";
import { hasPin } from "@/lib/crypto/pin";

export function LockScreen({ closing = false }: { closing?: boolean }) {
  useLanguage();
  const { unlock, unlockDevice, unlockPin, recover } = useVault();
  const [pinEnabled, setPinEnabled] = useState(false);
  const [usePin, setUsePin] = useState(false);
  useEffect(() => { let active = true; hasPin().then(v => { if (active) setPinEnabled(v); }); return () => { active = false; }; }, []);
  const [deviceEnabled, setDeviceEnabled] = useState(false);
  useEffect(() => { let active = true; getDeviceWrap().then((wrap) => { if (active) setDeviceEnabled(!!wrap); }); return () => { active = false; }; }, []);
  const look = useAppearance();
  const [forcePass, setForcePass] = useState(false);
  const hidden = passphraseHidden(look.hidePassphrase, pinEnabled, deviceEnabled) && !forcePass;
  // With the passphrase hidden, the PIN (if set) is the typed option; otherwise only fingerprint.
  const pinMode = hidden ? pinEnabled : usePin;
  const showField = !hidden || pinEnabled;
  const [mode, setMode] = useState<"pass" | "recover">("pass");
  const [pass, setPass] = useState("");
  const [phrase, setPhrase] = useState("");
  const [n1, setN1] = useState("");
  const [n2, setN2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setErr("");
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }
  const mark = (e: React.PointerEvent) => {
    touchPoint.x = (e.clientX / window.innerWidth) * 100;
    touchPoint.y = (e.clientY / window.innerHeight) * 100;
  };

  return (
    <div className={mode === "pass" ? "min-h-dvh" : "screen-center flex-col gap-5"} onPointerDown={mark}>
      <h1 className="sr-only">{t("Diary is locked")}</h1>
      {mode === "pass" ? (
        <>
          <div className={closing ? "cover-closing fixed inset-0" : "fixed inset-0"}>
            <BookCover full>
              {showField && <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(() => pinMode ? unlockPin(pass) : unlock(pass));
                }}
              >
                <Input
                  type="password"
                  autoFocus
                  inputMode={pinMode ? "numeric" : "text"}
                  aria-label={pinMode ? t("Diary PIN") : t("Passphrase")}
                  placeholder={pinMode ? t("Diary PIN") : t("Passphrase")}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  className="border-gold/60 bg-cover text-center text-gold placeholder:text-gold/60"
                />
                {err && <p className="text-center text-sm text-gold">{t(err)}</p>}
                <Button className="w-full border border-gold bg-transparent text-gold hover:bg-gold/10" disabled={busy || !pass}>
                  {busy ? t("Opening…") : t("Open")}
                </Button>
              </form>}
              {!showField && err && <p className="text-center text-sm text-gold">{t(err)}</p>}
          <div className="flex flex-col items-center gap-1 text-gold/90">
            {pinEnabled && !hidden && <Button variant="ghost" disabled={busy} onClick={() => { setUsePin(!usePin); setPass(""); setErr(""); }}>{usePin ? t("Use passphrase") : t("Use diary PIN")}</Button>}
            <Button type="button" variant="ghost" className="text-gold/70" disabled={busy} onClick={() => {
              if (deviceEnabled) void run(unlockDevice);
              else setErr("Open with your passphrase, then enable fingerprint unlock in Settings.");
            }}>
              <Fingerprint /> {t("Fingerprint unlock")}</Button>
            <button type="button" className="text-sm underline" onClick={() => setMode("recover")}>
              {t("Forgot passphrase?")}</button>
            {hidden && <button type="button" className="text-sm underline" onClick={() => { setForcePass(true); setUsePin(false); setPass(""); setErr(""); }}>{t("Use passphrase")}</button>}
          </div>
            </BookCover>
          </div>
        </>
      ) : (
        <form
          className="w-full max-w-sm space-y-3 rounded-md bg-paper p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (n1.length < 8) return setErr("Use at least 8 characters.");
            if (n1 !== n2) return setErr("New passphrases don't match.");
            void run(() => recover(phrase, n1));
          }}
        >
          <h2 className="font-display text-3xl">{t("Recover your diary")}</h2>
          <Textarea rows={3} autoCapitalize="none" placeholder={t("Your 12-word recovery phrase")} value={phrase} onChange={(e) => setPhrase(e.target.value)} />
          <Input type="password" placeholder={t("New passphrase")} value={n1} onChange={(e) => setN1(e.target.value)} />
          <Input type="password" placeholder={t("Repeat new passphrase")} value={n2} onChange={(e) => setN2(e.target.value)} />
          {err && <p className="text-sm text-destructive">{t(err)}</p>}
          <Button className="w-full" size="lg" disabled={busy}>
            {busy ? t("Checking…") : t("Unlock and set passphrase")}
          </Button>
          <button type="button" className="w-full text-sm text-muted-foreground underline" onClick={() => setMode("pass")}>
            {t("Back")}</button>
        </form>
      )}
    </div>
  );
}
