import { useState } from "react";
import { Fingerprint, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useVault } from "@/lib/vault-context";

export function LockScreen() {
  const { unlock, recover } = useVault();
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

  return (
    <div className="screen-center">
      <div className="w-full max-w-sm space-y-6">
        <header className="space-y-3 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-secondary">
            <Lock className="size-6 text-primary" />
          </div>
          <h1 className="font-display text-3xl">Diary is locked</h1>
        </header>

        {mode === "pass" ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => unlock(pass));
            }}
          >
            <Input type="password" autoFocus placeholder="Passphrase" value={pass} onChange={(e) => setPass(e.target.value)} />
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button className="w-full" size="lg" disabled={busy || !pass}>
              {busy ? "Unlocking…" : "Unlock"}
            </Button>
            <Button type="button" variant="outline" className="w-full" disabled>
              <Fingerprint /> Fingerprint · coming later
            </Button>
            <button type="button" className="w-full text-sm text-muted-foreground underline" onClick={() => setMode("recover")}>
              Forgot passphrase?
            </button>
          </form>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (n1.length < 8) return setErr("Use at least 8 characters.");
              if (n1 !== n2) return setErr("New passphrases don't match.");
              void run(() => recover(phrase, n1));
            }}
          >
            <Textarea
              rows={3}
              autoCapitalize="none"
              placeholder="Your 12-word recovery phrase"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
            />
            <Input type="password" placeholder="New passphrase" value={n1} onChange={(e) => setN1(e.target.value)} />
            <Input type="password" placeholder="Repeat new passphrase" value={n2} onChange={(e) => setN2(e.target.value)} />
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button className="w-full" size="lg" disabled={busy}>
              {busy ? "Checking…" : "Unlock and set passphrase"}
            </Button>
            <button type="button" className="w-full text-sm text-muted-foreground underline" onClick={() => setMode("pass")}>
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
