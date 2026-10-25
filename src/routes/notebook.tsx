import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil, Trash2, ThumbsUp, ThumbsDown } from "lucide-react";
import { AppHeader } from "@/components/diary/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useVault } from "@/lib/vault-context";
import { getPersonal, updatePersonal, type NotebookNote } from "@/lib/storage/personal";
export const Route = createFileRoute("/notebook")({ ssr: false, head: () => ({ meta: [
  { title: "Diary — What I know about you" }, { name: "description", content: "What your companion has learned about you, with your confirmation." }, { property: "og:title", content: "Diary — What I know about you" }, { property: "og:description", content: "Owner-confirmed facts and interpretations, encrypted locally." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
] }), component: NotebookPage });
function NotebookPage() {
  const { key, version, bump } = useVault(); const [notes, setNotes] = useState<NotebookNote[]>([]); const [edit, setEdit] = useState<string | null>(null); const [text, setText] = useState(""); const [error, setError] = useState("");
  useEffect(() => { let active = true; if (key) getPersonal(key).then(d => { if (active) setNotes(d.notebook); }); return () => { active = false; }; }, [key, version]);
  async function save() { if (!key || !edit || !text.trim()) return; try { await updatePersonal(key, d => ({ ...d, notebook: d.notebook.map(n => n.id === edit ? { ...n, text: text.trim() } : n) })); setEdit(null); setText(""); bump(); } catch { setError("Could not save note."); } }
  return <div className="app-shell"><AppHeader back title="Inner Universe" /><main className="space-y-5 px-4 pb-20">
    <p className="text-sm text-muted-foreground">Notes your companion suggests after reflections and conversations. Nothing lands here unless you accept it; thumbs steer future replies.</p>
    {edit && <div className="space-y-2"><Textarea aria-label="Edit note" value={text} onChange={e => setText(e.target.value)} /><div className="flex gap-2"><Button disabled={!text.trim()} onClick={save}>Save changes</Button><Button variant="ghost" onClick={() => { setEdit(null); setText(""); }}>Cancel</Button></div></div>}
    {error && <p role="alert">{error}</p>}
    {(["fact", "interpretation"] as const).map(k => <section key={k} className="space-y-3 border-t border-border pt-4"><h2 className="font-display text-3xl">{k === "fact" ? "Facts" : "Interpretations"}</h2>
      {!notes.some(n => n.kind === k) && <p className="text-sm text-muted-foreground">Nothing confirmed yet.</p>}
      {notes.filter(n => n.kind === k).map(n => <div key={n.id} className="flex items-start gap-2"><p className="flex-1 whitespace-pre-wrap break-words">{n.text}</p>
        {(["helpful", "unhelpful"] as const).map(f => <Button key={f} size="icon" variant={n.feedback === f ? "secondary" : "ghost"} aria-label={f === "helpful" ? "Note helped" : "Note did not help"} aria-pressed={n.feedback === f} title={f} onClick={async () => { if (!key) return; try { await updatePersonal(key, d => ({ ...d, notebook: d.notebook.map(x => x.id === n.id ? { ...x, feedback: x.feedback === f ? undefined : f } : x) })); bump(); } catch { setError("Could not save feedback."); } }}>{f === "helpful" ? <ThumbsUp /> : <ThumbsDown />}</Button>)}
        <Button size="icon" variant="ghost" title="Edit note" aria-label="Edit note" onClick={() => { setEdit(n.id); setText(n.text); }}><Pencil /></Button>
        <Button size="icon" variant="ghost" title="Delete note" aria-label="Delete note" onClick={async () => { if (!key || !window.confirm("Delete this note?")) return; try { await updatePersonal(key, d => ({ ...d, notebook: d.notebook.filter(x => x.id !== n.id) })); bump(); } catch { setError("Could not delete note."); } }}><Trash2 /></Button>
      </div>)}
    </section>)}
  </main></div>;
}
