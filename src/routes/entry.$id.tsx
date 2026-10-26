import { t, useLanguage, format } from "@/lib/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import { ReflectionPanel } from "@/components/diary/ReflectionPanel";
import { RibbonMark } from "@/components/diary/EntryToken";
import { pageTurn } from "@/lib/sounds";
import { TranscriptWords } from "@/components/diary/TranscriptWords";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/entry/$id")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { t?: number } => {
    const t = search["t"];
    return typeof t === "number" && Number.isFinite(t) && t >= 0 ? { t } : {};
  },
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
  useLanguage();
  const { id } = Route.useParams();
  const { t: startTime } = Route.useSearch();
  const { key, version, progress, bump } = useVault();
  const nav = useNavigate();
  const [entry, setEntry] = useState<Entry | null | undefined>(undefined);
  const [url, setUrl] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [view, setView] = useState<"journal" | "timed">("journal");
  const [editing, setEditing] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  /** Keep each line's timings and re-time only what the correction added or removed. */
  async function saveTranscript() {
    if (!key || !entry || editing === null) return;
    setSavingEdit(true);
    try {
      const lines = editing.split("\n").map(l => l.trim()).filter(Boolean);
      const old = entry.segments;
      const last = old[old.length - 1];
      const span = last ? last.end : 0;
      const segments = lines.map((text, i) => {
        const prior = old[i];
        if (prior) return { ...prior, text };
        const start = old.length ? span : (i / lines.length) * span;
        return { start, end: span, text };
      });
      const latest = await getEntry(key, entry.id);
      if (latest) { await putEntry(key, { ...latest, segments, edited: true }); bump(); }
      setEditing(null);
    } finally { setSavingEdit(false); }
  }
  const media = useRef<HTMLVideoElement & HTMLAudioElement>(null);

  useEffect(() => {
    let active = true;
    if (key) getEntry(key, id).then((e) => { if (active) setEntry(e ?? null); });
    return () => { active = false; };
  }, [key, id, version]);

  const ready = !!entry;
  useEffect(() => {
    if (!key || !entry) return;
    let u: string | null = null;
    let active = true;
    loadMedia(key, entry).then((b) => {
      if (!active) return;
      u = URL.createObjectURL(b);
      setUrl(u);
    });
    return () => {
      active = false;
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
        m.currentTime = startTime ?? 0;
      };
      m.addEventListener("durationchange", back);
      m.currentTime = 1e101;
    } else if (m && startTime !== undefined) {
      m.currentTime = startTime;
    }
  }

  function seek(time: number) {
    const m = media.current;
    if (!m) return;
    m.currentTime = time;
    void m.play();
  }

  if (entry === null) return <div className="screen-center text-paper">{t("Entry not found.")}</div>;
  if (!entry) return null;
  const p = progress[entry.id];

  return (
    <div className="app-shell">
      <AppHeader back title={format(entry.createdAt, "d MMM, HH:mm")} />
      <main className="space-y-5 px-4 pb-16">
        <div className={`overflow-hidden rounded-2xl bg-stage ${entry.kind === "written" ? "hidden" : ""}`}>
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

        <button
          aria-pressed={!!entry.ribbon}
          onClick={async () => {
            if (!key) return;
            const latest = await getEntry(key, entry.id);
            if (latest) { await putEntry(key, { ...latest, ribbon: !latest.ribbon }); bump(); }
          }}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${entry.ribbon ? "border-ribbon bg-accent text-ribbon" : "border-border text-muted-foreground"}`}
        >
          <RibbonMark className="w-3" /> {entry.ribbon ? t("Ribbon marked") : t("Mark with ribbon")}
        </button>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-3xl">{t("Transcript")}</h2>
            {entry.segments.length > 0 && (
              <div className="flex gap-1 text-sm" role="tablist">
                {(["journal", "timed"] as const).map((v) => (
                  <button key={v} role="tab" aria-selected={view === v} onClick={() => { setView(v); pageTurn(); }}
                    className={`rounded-full px-3 py-0.5 ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                    {v === "journal" ? t("Journal") : t("With times")}
                  </button>
                ))}
              </div>
            )}
          </div>
          {entry.status === "pending" && <p className="text-sm text-muted-foreground">{t("Waiting to transcribe…")}</p>}
          {entry.status === "transcribing" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {p?.phase === "download" ? t("Downloading speech model (first time only)") : t("Transcribing on this phone")}…{" "}
                {Math.round(p?.pct ?? 0)}%
              </p>
              <Progress value={p?.pct ?? 0} />
            </div>
          )}
          {entry.status === "error" && (
            <div className="space-y-2">
              <p className="text-sm text-destructive">{t("Transcription failed:")}{entry.error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!key) return;
                  await putEntry(key, { ...entry, status: "pending", error: undefined });
                  bump();
                }}
              >
                {t("Try again")}</Button>
            </div>
          )}
          {entry.status === "done" && entry.segments.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("No speech detected.")}</p>
          )}
          {view === "journal" && entry.segments.length > 0 && (editing === null ? (
            <>
              <div className="journal-page">{entry.segments.map((s, i) => <span key={i}><TranscriptWords entry={entry} segment={i} />{" "}</span>)}</div>
              <Button variant="outline" size="sm" onClick={() => setEditing(entry.segments.map(s => s.text).join("\n"))}>{t("Correct the transcript")}</Button>
            </>
          ) : (
            <div className="space-y-2">
              <Textarea aria-label={t("Correct the transcript")} rows={10} className="journal-page w-full" value={editing} onChange={(e) => setEditing(e.target.value)} />
              <p className="text-sm text-muted-foreground">{t("Timings stay with the lines they came from. Reflections use the corrected words.")}</p>
              <div className="flex gap-2">
                <Button size="sm" disabled={savingEdit} onClick={() => void saveTranscript()}>{savingEdit ? t("Saving…") : t("Save transcript")}</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>{t("Cancel")}</Button>
              </div>
            </div>
          ))}
          <ul className={`space-y-1 ${view === "journal" ? "hidden" : ""}`}>
            {entry.segments.map((s, i) => {
              const active = now >= s.start && now < s.end;
              return (
                <li key={i}>
                  <div className={`flex w-full gap-3 rounded-md px-2 py-1.5 text-left ${active ? "bg-secondary" : ""}`}>
                    <Button variant="ghost" onClick={() => seek(s.start)} aria-label={t("Play from {time}", { time: fmtDuration(s.start) })} className="h-auto w-10 shrink-0 p-0 font-mono text-xs text-muted-foreground">
                      {fmtDuration(s.start)}
                    </Button>
                    <span className="leading-relaxed"><TranscriptWords entry={entry} segment={i} /></span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <ReflectionPanel key={entry.id} entry={entry} />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="text-destructive">
              <Trash2 /> {t("Delete entry")}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("Delete this entry?")}</AlertDialogTitle>
              <AlertDialogDescription>{t("The recording and transcript will be gone for good.")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("Keep")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  await deleteEntry(entry.id);
                  bump();
                  nav({ to: "/" });
                }}
              >
                {t("Delete")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
