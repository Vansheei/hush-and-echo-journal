import { getAppearance } from "@/lib/appearance";
import { t, useLanguage } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getApiKey, getEntry, putEntry, type Entry } from "@/lib/storage/db";
import { requestReflection } from "@/lib/ai/anthropic";
import { threadConversation, type ThreadItem } from "@/lib/reflection-thread";
import { useVault } from "@/lib/vault-context";

/** Replies to a reflection plus the owner's own private notes, kept encrypted on the entry. */
export function ReflectionThread({ entry, entryText, context, mode }: { entry: Entry; entryText: string; context: string; mode: "listen" | "reflect" }) {
  useLanguage();
  const { key, settings, bump } = useVault();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; controller.current?.abort(); }; }, []);
  const thread = entry.thread ?? [];
  const reflection = entry.reflection;
  if (!reflection) return null;
  const reflectionText = reflection.text;

  async function append(items: ThreadItem[]) {
    if (!key) return;
    const latest = await getEntry(key, entry.id);
    if (!latest) throw new Error("Entry not found.");
    await putEntry(key, { ...latest, thread: [...(latest.thread ?? []), ...items] });
    bump();
  }

  async function addNote() {
    const note = text.trim();
    if (!note || busy) return;
    try { await append([{ id: crypto.randomUUID(), role: "note", text: note, at: Date.now() }]); setText(""); }
    catch { setError("Could not save."); }
  }

  async function send() {
    const reply = text.trim();
    if (!key || !reply || busy) return;
    setBusy(true); setError("");
    const abort = new AbortController(); controller.current = abort;
    try {
      const apiKey = await getApiKey(key);
      if (!apiKey) throw new Error("Save your Anthropic key in Settings first.");
      const answer = await requestReflection({
        confirmed: true, mode, apiKey, text: reply, context, model: settings.models.reflection, signal: abort.signal,
        conversation: threadConversation(entryText, reflectionText, thread),
        approach: "follow-up reply in an ongoing reflection on this entry; answer the owner's latest message",
      });
      if (!alive.current || abort.signal.aborted) return;
      const now = Date.now();
      await append([
        { id: crypto.randomUUID(), role: "you", text: reply, at: now },
        { id: crypto.randomUUID(), role: "claude", text: answer.text, at: now + 1 },
      ]);
      setText(""); setConfirming(false);
    } catch (e) { if (alive.current) setError(e instanceof Error ? e.message : "Reflection failed."); }
    finally { if (alive.current) setBusy(false); controller.current = null; }
  }

  return (
    <div className="space-y-3">
      {thread.length > 0 && (
        <ol className="space-y-3">
          {thread.map((item) => (
            <li key={item.id} className={item.role === "claude" ? "" : "border-l-2 border-gold pl-3"}>
              <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                {item.role === "you" ? t("You") : item.role === "claude" ? t("Claude") : t("My own note · only for me")}
              </span>
              <p className="whitespace-pre-wrap break-words">{item.text}</p>
            </li>
          ))}
        </ol>
      )}
      <Textarea aria-label={t("Reply or add your own note")} placeholder={t("Reply to Claude, or write your own note")} value={text} disabled={busy} onChange={(e) => setText(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={!text.trim() || busy || mode !== "reflect"} onClick={() => { setError(""); if (getAppearance().sendWithoutConfirm) void send(); else setConfirming(true); }}>
          {busy && !confirming ? t("Waiting for Claude…") : t("Reply to Claude")}
        </Button>
        <Button size="sm" variant="outline" disabled={!text.trim() || busy} onClick={() => void addNote()}>{t("Add my own note")}</Button>
      </div>
      {mode !== "reflect" && <p className="text-sm text-muted-foreground">{t("To ask Claude, switch this entry to Reflect.")}</p>}
      {!confirming && error && <p role="alert" className="break-words rounded border border-destructive p-2 text-sm text-destructive">{t(error)}</p>}
      <Dialog open={confirming} onOpenChange={(v) => { if (!v) controller.current?.abort(); setConfirming(v); }}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("Send this reply to Claude?")}</DialogTitle>
            <DialogDescription>{t("Your reply goes with this entry's text and the earlier replies. Your own notes are never sent.")}</DialogDescription>
          </DialogHeader>
          <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words bg-muted p-3 text-sm">{text}</pre>
          {error && <p role="alert" className="text-sm text-destructive">{t(error)}</p>}
          <div className="flex gap-2">
            <Button disabled={busy} onClick={() => void send()}>{busy ? t("Waiting for Claude…") : t("Confirm and send")}</Button>
            <Button variant="outline" onClick={() => { controller.current?.abort(); setConfirming(false); }}>{t("Cancel")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
