import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { AppHeader, fmtDuration } from "@/components/diary/AppHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteEntry, getEntry, loadMedia, putEntry, type Entry } from "@/lib/storage/db";
import { useVault } from "@/lib/vault-context";

export const Route = createFileRoute("/entry/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Diary — Entry" },
      { name: "description", content: "A private diary entry with its transcript." },
      { property: "og:title", content: "Diary — Entry" },
      { property: "og:description", content: "A private diary entry with its transcript." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EntryPage,
});

function EntryPage() {
  const { id } = Route.useParams();
  const { key, version, progress, bump } = useVault();
  const nav = useNavigate();
  const [entry, setEntry] = useState<Entry | null | undefined>(undefined);
  const [url, setUrl] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const media = useRef<HTMLVideoElement & HTMLAudioElement>(null);

  useEffect(() => {
    if (key) getEntry(key, id).then((e) => setEntry(e ?? null));
  }, [key, id, version]);

  const ready = !!entry;
  useEffect(() => {
    if (!key || !entry) return;
    let u: string | null = null;
    loadMedia(key, entry).then((b) => {
      u = URL.createObjectURL(b);
      setUrl(u);
    });
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, id, ready]);

  // WebM from MediaRecorder lacks duration; force Chrome to compute it so seeking works.
  function fixDuration() {
    const m = media.current;
    if (m && !Number.isFinite(m.duration)) {
      const back = () => {
        m.removeEventListener("durationchange", back);
        m.currentTime = 0;
      };
      m.addEventListener("durationchange", back);
      m.currentTime = 1e101;
    }
  }

  function seek(t: number) {
    const m = media.current;
    if (!m) return;
    m.currentTime = t;
    void m.play();
  }

  if (entry === null) return <div className="screen-center text-muted-foreground">Entry not found.</div>;
  if (!entry) return null;
  const p = progress[entry.id];

  return (
    <div className="app-shell">
      <AppHeader back title={format(entry.createdAt, "d MMM, HH:mm")} />
      <main className="space-y-5 px-4 pb-16">
        <div className="overflow-hidden rounded-2xl bg-stage">
          {url &&
            (entry.kind === "video" ? (
              <video
                ref={media}
                src={url}
                controls
                playsInline
                onLoadedMetadata={fixDuration}
                onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
                className="aspect-video w-full"
              />
            ) : (
              <div className="p-4">
                <audio
                  ref={media}
                  src={url}
                  controls
                  onLoadedMetadata={fixDuration}
                  onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
                  className="w-full"
                />
              </div>
            ))}
        </div>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transcript</h2>
          {entry.status === "pending" && <p className="text-sm text-muted-foreground">Waiting to transcribe…</p>}
          {entry.status === "transcribing" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {p?.phase === "download" ? "Downloading speech model (first time only)" : "Transcribing on this phone"}…{" "}
                {Math.round(p?.pct ?? 0)}%
              </p>
              <Progress value={p?.pct ?? 0} />
            </div>
          )}
          {entry.status === "error" && (
            <div className="space-y-2">
              <p className="text-sm text-destructive">Transcription failed: {entry.error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!key) return;
                  await putEntry(key, { ...entry, status: "pending", error: undefined });
                  bump();
                }}
              >
                Try again
              </Button>
            </div>
          )}
          {entry.status === "done" && entry.segments.length === 0 && (
            <p className="text-sm text-muted-foreground">No speech detected.</p>
          )}
          <ul className="space-y-1">
            {entry.segments.map((s, i) => {
              const active = now >= s.start && now < s.end;
              return (
                <li key={i}>
                  <button
                    onClick={() => seek(s.start)}
                    className={`flex w-full gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${active ? "bg-secondary" : "active:bg-muted"}`}
                  >
                    <span className="w-10 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground">
                      {fmtDuration(s.start)}
                    </span>
                    <span className="leading-relaxed">{s.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="text-destructive">
              <Trash2 /> Delete entry
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
              <AlertDialogDescription>The recording and transcript will be gone for good.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  await deleteEntry(entry.id);
                  bump();
                  nav({ to: "/" });
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
