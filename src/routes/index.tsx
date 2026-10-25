import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Plus, AlertCircle } from "lucide-react";
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

  useEffect(() => {
    let active = true;
    if (key) listEntries(key).then((rows) => { if (active) setEntries(rows); });
    return () => { active = false; };
  }, [key, version]);

  const groups: [string, Entry[]][] = [];
  for (const e of (entries ?? []).filter((x) => !onlyRibbon || x.ribbon)) {
    const l = dayLabel(e.createdAt);
    const g = groups.at(-1);
    if (g && g[0] === l) g[1].push(e);
    else groups.push([l, [e]]);
  }

  return (
    <div className="app-shell">
      <AppHeader title="Diary" />
      <SeasonScene />
      <nav className="flex flex-wrap items-center gap-5 px-4 pb-5 text-cover">
        <Link to="/loose-ends">Loose ends</Link>
        <Link to="/worry-parking">Worry parking</Link>
        <Link to="/people">People</Link>
        <Link to="/glossary">Glossary</Link>
        <Link to="/search">Search</Link>
        <Link to="/notebook">Notebook</Link>
        <Link to="/companion">Companion</Link>
        <button aria-pressed={onlyRibbon} onClick={() => setOnlyRibbon((v) => !v)} className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-sm ${onlyRibbon ? "border-ribbon bg-accent text-ribbon" : "border-border"}`}>
          <RibbonMark className="w-2.5" /> Ribboned
        </button>
      </nav>
      <main className="space-y-6 px-4 pb-32">
        {entries && entries.length === 0 && (
          <p className="pt-20 text-center text-muted-foreground">No entries yet. Tap record when you're ready.</p>
        )}
        {entries && entries.length > 0 && onlyRibbon && groups.length === 0 && (
          <p className="pt-12 text-center text-muted-foreground">No ribboned entries yet. Open an entry and tap the ribbon to mark it.</p>
        )}
        {groups.map(([label, list]) => (
          <section key={label} className="space-y-2">
            <h2 className="day-label">{label}</h2>
            {list.map((e) => {
              const p = progress[e.id];
              const snippet = e.segments.map((s) => s.text).join(" ");
              return (
                <Link
                  key={e.id}
                  to="/entry/$id"
                  params={{ id: e.id }}
                  onClick={() => { if (e.kind === "audio") cassetteClick(); }}
                  className="relative flex items-center gap-3 rounded-md border border-border/70 bg-card p-3 transition-transform active:scale-[0.99]"
                >
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
                      {e.status === "transcribing" &&
                        (p?.phase === "download"
                          ? `Downloading speech model ${Math.round(p.pct)}%`
                          : `Transcribing ${p?.pct ?? 0}%`)}
                      {e.status === "error" && (
                        <span className="inline-flex items-center gap-1 text-destructive">
                          <AlertCircle className="size-3" /> Transcription failed
                        </span>
                      )}
                    </p>
                  </div>
                </Link>
              );
            })}
          </section>
        ))}
      </main>
      <Link to="/record" className="record-fab" aria-label="Record">
        <Plus className="size-7" />
      </Link>
    </div>
  );
}
