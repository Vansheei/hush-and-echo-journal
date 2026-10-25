import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Plus, AlertCircle, ArrowDownUp } from "lucide-react";
import { BookIndex, SECTIONS } from "@/components/diary/BookIndex";
import { TurnableBook } from "@/components/diary/TurnableBook";
import { EntryToken, RibbonMark } from "@/components/diary/EntryToken";
import { SeasonScene } from "@/components/diary/SeasonScene";
import { cassetteClick } from "@/lib/sounds";
import { AppHeader, fmtDuration } from "@/components/diary/AppHeader";
import { listEntries, type Entry } from "@/lib/storage/db";
import { useVault } from "@/lib/vault-context";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Diary — Timeline" },
      { name: "description", content: "Your private, encrypted voice and video journal." },
      { property: "og:title", content: "Diary — Timeline" },
      { property: "og:description", content: "Your private, encrypted voice and video journal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Timeline,
});

type IndexItemLike = { label: string; onSelect: () => void };

function dayLabel(t: number) {
  const d = new Date(t);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, d MMMM yyyy");
}

function Timeline() {
  const { key, version, progress } = useVault();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [onlyRibbon, setOnlyRibbon] = useState(false);
  const [page, setPage] = useState(0);
  const [newestFirst, setNewestFirst] = useState(true);

  useEffect(() => {
    let active = true;
    if (key) listEntries(key).then((rows) => { if (active) setEntries(rows); });
    return () => { active = false; };
  }, [key, version]);

  const groups: [string, Entry[]][] = [];
  const shown = (entries ?? []).filter((x) => !onlyRibbon || x.ribbon).sort((a, b) => newestFirst ? b.createdAt - a.createdAt : a.createdAt - b.createdAt);
  for (const e of shown) {
    const l = dayLabel(e.createdAt);
    const g = groups.at(-1);
    if (g && g[0] === l) g[1].push(e);
    else groups.push([l, [e]]);
  }

  const renderEntry = (e: Entry) => {
    const p = progress[e.id];
    const snippet = e.segments.map((s) => s.text).join(" ");
    return (
      <Link key={e.id} to="/entry/$id" params={{ id: e.id }} onClick={() => { if (e.kind === "audio") cassetteClick(); }}
        className="relative flex items-center gap-3 rounded-md border border-border/70 bg-card p-3">
        {e.ribbon && <RibbonMark className="absolute -top-1 right-16" />}
        <EntryToken kind={e.kind} id={e.id} />
        <div className="min-w-0 flex-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-base">{format(e.createdAt, "HH:mm")}</span>
            <span className="text-muted-foreground">{fmtDuration(e.durationSec)}</span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-muted-foreground">
            {e.status === "done" && (snippet || "No speech detected")}
            {e.status === "pending" && "Waiting to transcribe…"}
            {e.status === "transcribing" && (p?.phase === "download" ? `Downloading speech model ${Math.round(p.pct)}%` : `Transcribing ${p?.pct ?? 0}%`)}
            {e.status === "error" && <span className="inline-flex items-center gap-1 text-destructive"><AlertCircle className="size-3" /> Transcription failed</span>}
          </p>
        </div>
      </Link>
    );
  };

  const keepsakes: IndexItemLike = { label: "The Keepsakes", onSelect: () => { setOnlyRibbon(true); setPage(1); } };
  const chaptersByDay: IndexItemLike = { label: "Chapters by day", onSelect: () => { setOnlyRibbon(false); setPage(1); } };
  const indexPage = (
    <div className="relative">
      <SeasonScene />
      <BookIndex items={[...SECTIONS, keepsakes, chaptersByDay]} days={[]} />
    </div>
  );
  const chaptersPage = (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="day-label">{onlyRibbon ? "The Keepsakes" : "Chapters"}</h2>
        <button type="button" onClick={() => setNewestFirst((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-0.5 text-sm">
          <ArrowDownUp className="size-3.5" /> {newestFirst ? "Latest tea first" : "Oldest tea first"}
        </button>
      </div>
      {groups.map(([label, list]) => (
        <div key={label} className="space-y-2">
          <h3 className="font-display text-2xl">{label} <span className="font-sans text-sm text-muted-foreground">{format(list[0]!.createdAt, "d MMMM yyyy")}</span></h3>
          {list.map(renderEntry)}
        </div>
      ))}
    </section>
  );
  const empty = entries && (entries.length === 0
    ? <p className="pt-16 text-center text-muted-foreground">No chapters yet. Tap Begin a Chapter when you're ready.</p>
    : onlyRibbon && groups.length === 0 ? <p className="pt-12 text-center text-muted-foreground">No keepsakes yet. Open an entry and tap the ribbon to keep it.</p> : null);
  const pages = [indexPage, groups.length ? chaptersPage : (empty ?? chaptersPage)];

  return (
    <div className="app-shell">
      <AppHeader title="Vanshi’s Diary" />
      <div className="relative z-[1] flex justify-end px-4 pb-3">
        <button aria-pressed={onlyRibbon} onClick={() => { setOnlyRibbon((v) => !v); setPage(0); }} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-sm ${onlyRibbon ? "border-ribbon bg-accent text-ribbon" : "border-border"}`}>
          <RibbonMark className="w-2.5" /> The Keepsakes
        </button>
      </div>
      <main className="relative z-[1] px-4 pb-32">
        <TurnableBook pages={pages} page={Math.min(page, pages.length - 1)} onPage={setPage} />
      </main>
      <Link to="/record" className="record-fab" aria-label="Begin a Chapter">
        <Plus className="size-7" />
      </Link>
    </div>
  );
}
