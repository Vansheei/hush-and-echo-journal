import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Search, Square } from "lucide-react";
import { AppHeader, fmtDuration } from "@/components/diary/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVault } from "@/lib/vault-context";
import { listEntries } from "@/lib/storage/db";
import { semanticSearch, stopSearch } from "@/lib/search";
export const Route = createFileRoute("/search")({ ssr: false, head: () => ({ meta: [
  { title: "Diary — Search" }, { name: "description", content: "Search your private diary locally by meaning or words." },
  { property: "og:title", content: "Diary — Search" }, { property: "og:description", content: "Local multilingual search through your diary." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
] }), component: SearchPage });
type Result = { entryId: string; start: number; text: string };
function SearchPage() {
  const { key } = useVault(); const [query, setQuery] = useState(""); const [kind, setKind] = useState<"words" | "meaning">("words"); const [results, setResults] = useState<Result[]>([]); const [status, setStatus] = useState(""); const [busy, setBusy] = useState(false); const active = useRef(true); const request = useRef(0);
  useEffect(() => { active.current = true; return () => { active.current = false; request.current++; stopSearch(); }; }, []);
  async function search() {
    if (!key || !query.trim()) return; const run = ++request.current; setBusy(true); setStatus(""); setResults([]);
    const alive = () => active.current && run === request.current;
    try { const entries = await listEntries(key); if (!alive()) return;
      const found = kind === "meaning" ? await semanticSearch(key, entries, query, alive, t => { if (alive()) setStatus(t); }) : entries.flatMap(e => e.segments.filter(s => s.text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).map(s => ({ entryId: e.id, start: s.start, text: s.text })));
      if (alive()) { setResults(found); setStatus(found.length ? "" : "No matches."); }
    } catch (e) { if (alive()) setStatus(e instanceof Error ? e.message : "Search failed."); }
    finally { if (alive()) setBusy(false); }
  }
  return <div className="app-shell"><AppHeader back title="Search" /><main className="space-y-5 px-4 pb-20"><div className="flex gap-2">{(["words", "meaning"] as const).map(v => <Button key={v} variant={kind === v ? "default" : "outline"} disabled={busy} onClick={() => setKind(v)}>{v === "words" ? "Words" : "Meaning"}</Button>)}</div><form className="flex gap-2" onSubmit={e => { e.preventDefault(); void search(); }}><Input aria-label="Search diary" value={query} onChange={e => setQuery(e.target.value)} /><Button size="icon" type="submit" aria-label="Search" title="Search" disabled={busy || !query.trim()}><Search /></Button>{busy && <Button type="button" size="icon" variant="outline" aria-label="Stop search" onClick={() => { request.current++; stopSearch(); setBusy(false); setStatus("Stopped."); }}><Square /></Button>}</form>{status && <p role="status" className="text-sm text-muted-foreground">{status}</p>}<ul className="space-y-3">{results.map((r, i) => <li key={i}><Link to="/entry/$id" params={{ id: r.entryId }} search={{ t: r.start }} className="block border-b border-border py-3"><span className="font-mono text-xs text-muted-foreground">{fmtDuration(r.start)}</span><p className="break-words">{r.text}</p></Link></li>)}</ul></main></div>;
}