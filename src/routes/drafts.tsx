import { t, useLanguage } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Copy, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/diary/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVault } from "@/lib/vault-context";
import { getApiKey, listEntries, type Entry } from "@/lib/storage/db";
import { contextText, getPersonal, updatePersonal, type Draft } from "@/lib/storage/personal";
import { requestReflection } from "@/lib/ai/anthropic";

export const Route = createFileRoute("/drafts")({ ssr: false, head: () => ({ meta: [
  { title: "Diary — Drafts" }, { name: "description", content: "Drafts written for you from your private diary. Nothing is ever sent." }, { property: "og:title", content: "Diary — Drafts" }, { property: "og:description", content: "Claude drafts texts or emails from your entries; it never sends anything." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
] }), component: DraftsPage });

function DraftsPage() {
  useLanguage();
  const { key, settings, version, bump } = useVault();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [source, setSource] = useState("chat");
  const [instruction, setInstruction] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState("");
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => { active.current = true; return () => { active.current = false; controller.current?.abort(); }; }, []);
  useEffect(() => {
    let ok = true;
    if (key) {
      listEntries(key).then(rows => { if (ok) setEntries(rows.filter(e => e.status === "done")); });
      getPersonal(key).then(d => { if (ok) setDrafts(d.drafts); });
    }
    return () => { ok = false; };
  }, [key, version]);

  async function prepare() {
    if (!key || !instruction.trim() || busy) return;
    const personal = await getPersonal(key);
    const entry = entries.find(e => e.id === source);
    const material = entry
      ? `Source diary entry ${new Date(entry.createdAt).toISOString()}:\n${entry.segments.map(s => s.text).join(" ")}`
      : `Source conversation:\n${personal.chat.slice(-16).map(m => `${m.role}: ${m.text}`).join("\n")}`;
    setPreview(`${contextText(personal)}\n${material}\n\nInstruction: ${instruction.trim()}`);
    setError(""); setOpen(true);
  }
  async function run() {
    if (!key || busy) return;
    setBusy(true); setError("");
    const abort = new AbortController(); controller.current = abort;
    try {
      const apiKey = await getApiKey(key);
      if (!apiKey) throw new Error("Save your Anthropic key in Settings first.");
      const result = await requestReflection({
        confirmed: true, mode: "reflect", apiKey, signal: abort.signal, model: settings.models.drafts,
        text: `Write this draft for me: ${instruction.trim()}`,
        context: `${preview}\nReturn the draft itself in "text". Write only the draft, ready to copy. You can never send anything.`,
        approach: "ghostwriting a text or email draft",
      });
      if (!active.current || abort.signal.aborted) return;
      await updatePersonal(key, d => ({ ...d, drafts: [{ id: crypto.randomUUID(), text: result.text, createdAt: Date.now() }, ...d.drafts] }));
      if (!active.current) return;
      setOpen(false); setInstruction(""); bump();
    } catch (e) { if (active.current) setError(e instanceof Error ? e.message : "Draft failed."); }
    finally { if (active.current) setBusy(false); controller.current = null; }
  }

  return <div className="app-shell"><AppHeader back title={t("Unsent Letters")} /><main className="space-y-5 px-4 pb-20">
    <p className="text-sm text-muted-foreground">{t("Claude writes a text or email from an entry or your conversation. It never sends anything — you copy it yourself.")}</p>
    <Select value={source} onValueChange={setSource}>
      <SelectTrigger aria-label={t("Draft source")}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="chat">{t("From our conversation")}</SelectItem>
        {entries.map(e => <SelectItem key={e.id} value={e.id}>{t("Entry ·")}{format(e.createdAt, "d MMM, HH:mm")}</SelectItem>)}
      </SelectContent>
    </Select>
    <Textarea aria-label={t("What should the draft say?")} placeholder={t("e.g. a firm but kind message to my landlord about the heating")} value={instruction} onChange={e => setInstruction(e.target.value)} />
    <Button disabled={!instruction.trim() || busy} onClick={prepare}>{busy ? t("Waiting for Claude…") : t("Write draft")}</Button>
    {!open && error && <p role="alert" className="text-sm text-destructive">{t(error)}</p>}
    {status && <p role="status" className="text-sm text-muted-foreground">{t(status)}</p>}
    <section className="space-y-4 border-t border-border pt-4">
      {drafts.map(d => <article key={d.id} className="space-y-2">
        <p className="whitespace-pre-wrap break-words">{d.text}</p>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(d.text); setStatus("Copied."); } catch { setStatus("Could not copy; select the text manually."); } }}><Copy /> {t("Copy")}</Button>
          <Button size="icon" variant="ghost" aria-label={t("Delete draft")} title={t("Delete draft")} onClick={async () => { if (!key || !window.confirm(t("Delete this draft?"))) return; try { await updatePersonal(key, x => ({ ...x, drafts: x.drafts.filter(y => y.id !== d.id) })); bump(); } catch { setStatus("Could not delete draft."); } }}><Trash2 /></Button>
        </div>
      </article>)}
      {!drafts.length && <p className="text-sm text-muted-foreground">{t("No drafts yet.")}</p>}
    </section>
    {source !== "chat" && <p className="text-sm">{t("Source:")}<Link to="/entry/$id" params={{ id: source }} search={{}} className="text-primary underline">{t("open entry")}</Link></p>}
  </main>
  <Dialog open={open} onOpenChange={v => { if (!v) controller.current?.abort(); setOpen(v); }}>
    <DialogContent className="max-h-[85dvh] overflow-y-auto">
      <DialogHeader><DialogTitle>{t("Send this source text to Claude?")}</DialogTitle><DialogDescription>{t("Only the text below leaves this device, once, to write the draft. The draft itself is never sent anywhere.")}</DialogDescription></DialogHeader>
      <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words bg-muted p-3 text-sm">{preview}</pre>
      {error && <p role="alert" className="text-sm text-destructive">{t(error)}</p>}
      <div className="flex gap-2"><Button disabled={busy} onClick={run}>{busy ? t("Waiting for Claude…") : t("Confirm and send")}</Button><Button variant="outline" onClick={() => { controller.current?.abort(); setOpen(false); }}>{t("Cancel")}</Button></div>
    </DialogContent>
  </Dialog></div>;
}
