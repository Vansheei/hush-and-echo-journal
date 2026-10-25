import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Mic, Video, Plus, AlertCircle } from "lucide-react";
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

  useEffect(() => {
    if (key) listEntries(key).then(setEntries);
  }, [key, version]);

  const groups: [string, Entry[]][] = [];
  for (const e of entries ?? []) {
    const l = dayLabel(e.createdAt);
    const g = groups.at(-1);
    if (g && g[0] === l) g[1].push(e);
    else groups.push([l, [e]]);
  }

  return (
    <div className="app-shell">
      <AppHeader title="Diary" />
      <main className="space-y-6 px-4 pb-32">
        {entries && entries.length === 0 && (
          <p className="pt-20 text-center text-muted-foreground">No entries yet. Tap record when you're ready.</p>
        )}
        {groups.map(([label, list]) => (
          <section key={label} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</h2>
            {list.map((e) => {
              const p = progress[e.id];
              const snippet = e.segments.map((s) => s.text).join(" ");
              return (
                <Link
                  key={e.id}
                  to="/entry/$id"
                  params={{ id: e.id }}
                  className="flex gap-3 rounded-xl bg-card p-4 shadow-soft transition-transform active:scale-[0.99]"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                    {e.kind === "video" ? <Video className="size-5" /> : <Mic className="size-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{format(e.createdAt, "HH:mm")}</span>
                      <span className="text-muted-foreground">{fmtDuration(e.durationSec)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
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
