import { t, useLanguage } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getApiKey, getEntry, putEntry, putItem, type Entry } from "@/lib/storage/db";
import { requestReflection } from "@/lib/ai/anthropic";
import { useVault } from "@/lib/vault-context";
import { contextText, getPersonal } from "@/lib/storage/personal";
import { Clarifications } from "./Clarifications";

export function ReflectionPanel({ entry }: { entry: Entry }) {
  useLanguage();
  const { key, settings, bump } = useVault();
  const [notes, setNotes] = useState((entry.toneNotes ?? []).join("\n"));
  const [includeTone, setIncludeTone] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [context, setContext] = useState("");
  useEffect(() => { let alive = true; if (key) getPersonal(key).then(d => { if (alive) setContext(contextText(d)); }); return () => { alive = false; }; }, [key, entry]);
  const controller = useRef<AbortController | null>(null);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; controller.current?.abort(); }; }, []);
  const mode = entry.mode ?? settings.mode;
  async function setMode(m: "listen" | "reflect") {
    if (!key) return;
    const latest = await getEntry(key, entry.id);
    if (latest) { await putEntry(key, { ...latest, mode: m }); bump(); }
  }
  const transcript = entry.segments.map((s) => s.text).join("\n");
  const outgoing = transcript + (includeTone && notes.trim() ? `\n\nOptional, uncertain tone notes:\n${notes}` : "");
  async function reflect() {
    if (!key || busy) return;
    setBusy(true); setError("");
    const abort = new AbortController(); controller.current = abort;
    try {
      const apiKey = await getApiKey(key);
      if (!active.current) return;
      if (!apiKey) throw new Error("Save your Anthropic key in Settings first.");
      const reflection = await requestReflection({ confirmed: true, mode, apiKey, text: outgoing, context, model: settings.models.reflection, signal: abort.signal });
      if (!active.current || abort.signal.aborted) return;
      const latest = await getEntry(key, entry.id);
      if (!active.current || !latest) return;
      const flagged = Array.from(new Set([...(latest.flagged ?? []), ...(reflection.suggestions?.meanings ?? []).map(m => m.phrase.toLowerCase())]));
      await putEntry(key, { ...latest, reflection, flagged });
      bump(); setOpen(false);
    } catch (e) { if (active.current) setError(e instanceof Error ? e.message : "Reflection failed."); }
    finally { if (active.current) setBusy(false); controller.current = null; }
  }
  async function accept(text: string, kind: "loose" | "worry") {
    if (!key) return;
    try {
      await putItem(key, { id: crypto.randomUUID(), kind, text, closed: false, createdAt: Date.now(), entryId: entry.id });
      const latest = await getEntry(key, entry.id);
      if (latest?.reflection) {
        const field = kind === "loose" ? "looseEnds" : "worries";
        await putEntry(key, { ...latest, reflection: { ...latest.reflection, [field]: latest.reflection[field].filter((s) => s !== text) } });
      }
      bump();
    } catch { setError("Could not save the item. Please try again."); }
  }
  if (entry.status !== "done") return <p className="border-t border-border pt-5 text-sm text-muted-foreground">
    {entry.status === "error" ? t("Transcription failed, so reflection isn't available for this entry.") : t("Reflection and tone notes appear here once the transcript is ready. Keep the app open while it finishes.")}
  </p>;
  return <section className="space-y-4 border-t border-border pt-5">
    <div className="space-y-2">
      <h2 className="font-medium">{t("For this entry")}</h2>
      <div className="flex gap-2">{(["listen", "reflect"] as const).map((m) => <Button key={m} size="sm" aria-pressed={mode === m} variant={mode === m ? "default" : "outline"} onClick={() => setMode(m)}>{m === "listen" ? t("Listen") : t("Reflect")}</Button>)}</div>
      <p className="text-sm text-muted-foreground">{mode === "listen" ? t("Listen: nothing is sent, no reflection.") : t("Reflect: you can ask Claude for a reflection, after confirming.")}{entry.mode ? "" : t(" (Default from Settings.)")}</p>
    </div>
    <h2 className="font-medium">{t("Tone notes")}</h2>
    <Textarea aria-label={t("Tone notes")} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("No clear voice cues")} />
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={async () => { if (key) { const latest = await getEntry(key, entry.id); if (latest) await putEntry(key, { ...latest, toneNotes: notes.split("\n").filter(Boolean) }); bump(); } }}>{t("Save notes")}</Button>
      <Button size="sm" variant="ghost" onClick={async () => { setNotes(""); if (key) { const latest = await getEntry(key, entry.id); if (latest) await putEntry(key, { ...latest, toneNotes: [] }); bump(); } }}>{t("Remove notes")}</Button>
    </div>
    {mode === "reflect" && transcript.trim() && <Button onClick={() => { setError(""); setOpen(true); }}>{t("Request reflection")}</Button>}
    {entry.reflection && <div className="space-y-3">
      <h2 className="font-medium">{t("Reflection")}</h2><p className="whitespace-pre-wrap break-words">{entry.reflection.text}</p>
      <Clarifications suggestions={entry.reflection.suggestions} />
      {entry.reflection.looseEnds.map((text, i) => <div key={`l${i}`} className="space-y-2"><p>{text}</p><Button size="sm" variant="outline" onClick={() => accept(text, "loose")}>{t("Add to loose ends")}</Button></div>)}
      {entry.reflection.worries.map((text, i) => <div key={`w${i}`} className="space-y-2"><p>{text}</p><Button size="sm" variant="outline" onClick={() => accept(text, "worry")}>{t("Park this worry")}</Button></div>)}
    </div>}
    {!open && error && <p role="alert" className="text-sm text-destructive">{t(error)}</p>}
    <Dialog open={open} onOpenChange={(v) => { if (!v) controller.current?.abort(); setOpen(v); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t("Send this text to Claude?")}</DialogTitle><DialogDescription>{t("Only the text below will leave this device. No audio or video is sent.")}</DialogDescription></DialogHeader>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={includeTone} disabled={busy} onChange={(e) => setIncludeTone(e.target.checked)} />{t("Include tone notes")}</label>
        <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words bg-muted p-3 text-sm">{outgoing}{"\n\n"}{context}</pre>
        {error && <p role="alert" className="text-sm text-destructive">{t(error)}</p>}
        <div className="flex gap-2"><Button disabled={busy} onClick={reflect}>{busy ? t("Waiting for Claude…") : t("Confirm and send")}</Button><Button variant="outline" onClick={() => { controller.current?.abort(); setOpen(false); }}>{t("Cancel")}</Button></div>
      </DialogContent>
    </Dialog>
  </section>;
}