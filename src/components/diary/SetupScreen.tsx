import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createVault } from "@/lib/crypto/vault";
import { useVault } from "@/lib/vault-context";

type Created = Awaited<ReturnType<typeof createVault>>;

export function SetupScreen() {
  const { finishSetup } = useVault();
  const [step, setStep] = useState<"pass" | "phrase" | "confirm">("pass");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [created, setCreated] = useState<Created | null>(null);
  const [wrote, setWrote] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const words = created?.phrase.split(" ") ?? [];
  const checks = useMemo(() => {
    if (!words.length) return [];
    const idx = new Set<number>();
    while (idx.size < 3) idx.add(Math.floor(Math.random() * 12));
    return [...idx].sort((a, b) => a - b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [created]);

  async function makeVault() {
    setErr("");
    if (p1.length < 8) return setErr("Use at least 8 characters.");
    if (p1 !== p2) return setErr("Passphrases don't match.");
    setBusy(true);
    setCreated(await createVault(p1));
    setBusy(false);
    setStep("phrase");
  }

  async function confirm() {
    if (!created) return;
    const ok = checks.every((i) => (answers[i] ?? "").trim().toLowerCase() === words[i]);
    if (!ok) return setErr("Some words don't match. Check what you wrote down.");
    setBusy(true);
    await finishSetup(created.meta, created.key);
  }

  return (
    <div className="screen-center [&>*]:rounded-md [&>*]:bg-paper [&>*]:p-6">
      <div className="w-full max-w-sm space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="font-display text-4xl">Diary</h1>
          <p className="text-muted-foreground">Everything stays on this phone, encrypted.</p>
        </header>

        {step === "pass" && (
          <div className="space-y-3">
            <Input type="password" placeholder="Choose a passphrase" value={p1} onChange={(e) => setP1(e.target.value)} />
            <Input type="password" placeholder="Repeat passphrase" value={p2} onChange={(e) => setP2(e.target.value)} />
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button className="w-full" size="lg" disabled={busy} onClick={makeVault}>
              {busy ? "Creating your diary…" : "Continue"}
            </Button>
          </div>
        )}

        {step === "phrase" && (
          <div className="space-y-4">
            <p className="text-sm">
              This is your recovery phrase. Write it down on paper. It's the only way back in if you forget your
              passphrase, and it will not be shown again.
            </p>
            <ol className="grid grid-cols-3 gap-2 rounded-xl bg-card p-4 shadow-soft">
              {words.map((w, i) => (
                <li key={i} className="text-sm">
                  <span className="text-muted-foreground">{i + 1}.</span> <span className="font-medium">{w}</span>
                </li>
              ))}
            </ol>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={wrote} onChange={(e) => setWrote(e.target.checked)} />I wrote it down
            </label>
            <Button className="w-full" size="lg" disabled={!wrote} onClick={() => setStep("confirm")}>
              Next
            </Button>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-3">
            <p className="text-sm">Type these words from your phrase to confirm.</p>
            {checks.map((i) => (
              <Input
                key={i}
                autoCapitalize="none"
                placeholder={`Word #${i + 1}`}
                value={answers[i] ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
              />
            ))}
            {err && <p className="text-sm text-destructive">{err}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("phrase")}>
                Back
              </Button>
              <Button className="flex-1" disabled={busy} onClick={confirm}>
                Open diary
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
