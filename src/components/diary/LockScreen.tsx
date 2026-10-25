import { useState } from "react";
import { Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useVault } from "@/lib/vault-context";
import { touchPoint } from "@/lib/appearance";
import { BookCover } from "./BookCover";

export function LockScreen({ closing = false }: { closing?: boolean }) {
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
  const mark = (e: React.PointerEvent) => {
    touchPoint.x = (e.clientX / window.innerWidth) * 100;
    touchPoint.y = (e.clientY / window.innerHeight) * 100;
  };

  return (
    <div className="screen-center flex-col gap-5" onPointerDown={mark}>
      <h1 className="sr-only">Diary is locked</h1>
      {mode === "pass" ? (
        <>
          <div className={closing ? "cover-closing w-full flex justify-center" : "w-full flex justify-center"}>
            <BookCover>
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(() => unlock(pass));
                }}
              >
                <Input
                  type="password"
                  autoFocus
                  aria-label="Passphrase"
                  placeholder="Passphrase"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  className="border-gold/60 bg-cover text-center text-gold placeholder:text-gold/60"
                />
                {err && <p className="text-center text-sm text-gold">{err}</p>}
                <Button className="w-full border border-gold bg-transparent text-gold hover:bg-gold/10" disabled={busy || !pass}>
                  {busy ? "Opening…" : "Open"}
                </Button>
              </form>
            </BookCover>
          </div>
          <div className="flex flex-col items-center gap-2 text-gold/80">
            <Button type="button" variant="ghost" className="text-gold/70" disabled>
              <Fingerprint /> Fingerprint · coming later
            </Button>
            <button type="button" className="text-sm underline" onClick={() => setMode("recover")}>
              Forgot passphrase?
            </button>
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
          <h2 className="font-display text-3xl">Recover your diary</h2>
          <Textarea rows={3} autoCapitalize="none" placeholder="Your 12-word recovery phrase" value={phrase} onChange={(e) => setPhrase(e.target.value)} />
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
  );
}
