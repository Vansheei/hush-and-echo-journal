import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, RefreshCw, Square, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtDuration } from "@/components/diary/AppHeader";
import { saveEntry } from "@/lib/storage/db";
import { useVault } from "@/lib/vault-context";

export const Route = createFileRoute("/record")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Diary — New entry" },
      { name: "description", content: "Record a private voice or video entry." },
      { property: "og:title", content: "Diary — New entry" },
      { property: "og:description", content: "Record a private voice or video entry." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecordPage,
});

const pick = (list: string[]) => list.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

function RecordPage() {
  const { key, setBusy, bump } = useVault();
  const nav = useNavigate();
  const [kind, setKind] = useState<"video" | "audio">("video");
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [state, setState] = useState<"idle" | "rec" | "paused" | "review">("idle");
  const [secs, setSecs] = useState(0);
  const [result, setResult] = useState<{ blob: Blob; url: string } | null>(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const preview = useRef<HTMLVideoElement>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Stable callback avoids stopping the stream whenever the provider renders.
  useEffect(() => {
    return () => {
      stopStream();
      setBusy(false);
    };
  }, [setBusy, stopStream]);
  useEffect(() => { setBusy(state !== "idle" || saving); }, [state, saving, setBusy]);

  useEffect(() => {
    if (state !== "idle") return;
    let cancelled = false;
    stopStream();
    setErr("");
    navigator.mediaDevices
      .getUserMedia(
        kind === "video"
          ? { audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: facing } }
          : { audio: true },
      )
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        streamRef.current = s;
        if (preview.current) preview.current.srcObject = kind === "video" ? s : null;
      })
      .catch(() => setErr("Camera or microphone permission is needed."));
    return () => {
      cancelled = true;
    };
  }, [kind, facing, state, stopStream]);

  useEffect(() => {
    if (state !== "rec") return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  function start() {
    const s = streamRef.current;
    if (!s) return;
    const mimeType =
      kind === "video"
        ? pick(["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"])
        : pick(["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]);
    const rec = new MediaRecorder(s, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: 1_500_000,
      audioBitsPerSecond: 96_000,
    });
    const parts: Blob[] = [];
    setBusy(true);
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(parts, { type: rec.mimeType || mimeType });
      setResult({ blob, url: URL.createObjectURL(blob) });
      stopStream();
      setState("review");
    };
    rec.start(1000);
    recRef.current = rec;
    setSecs(0);
    setState("rec");
  }

  function discard() {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setState("idle");
  }

  async function save() {
    if (!key || !result) return;
    setSaving(true);
    try {
      await saveEntry(key, result.blob, {
      kind,
      mimeType: result.blob.type,
      durationSec: Math.max(1, secs),
    });
    URL.revokeObjectURL(result.url);
    bump();
      await nav({ to: "/" });
    } catch {
      setErr("Could not save. Your recording is still here; try again.");
      setSaving(false);
    }
  }

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-stage text-stage-foreground">
      <div className="flex items-center justify-between p-4">
        <Button variant="ghost" size="icon" className="icon-btn" aria-label="Close" disabled={state !== "idle" || saving} onClick={() => nav({ to: "/" })}>
          <X className="size-5" />
        </Button>
        <span className="font-mono text-lg tabular-nums">{fmtDuration(secs)}</span>
        {kind === "video" && state === "idle" ? (
          <button
            className="icon-btn"
            aria-label="Switch camera"
            onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
          >
            <RefreshCw className="size-5" />
          </button>
        ) : (
          <span className="size-10" />
        )}
      </div>

      <div className="relative mx-4 flex flex-1 items-center justify-center overflow-hidden rounded-2xl bg-stage-muted">
        {state === "review" && result ? (
          kind === "video" ? (
            <video src={result.url} controls playsInline className="size-full object-contain" />
          ) : (
            <audio src={result.url} controls className="w-4/5" />
          )
        ) : kind === "video" ? (
          <video ref={preview} autoPlay muted playsInline className="size-full object-cover" />
        ) : (
          <Mic className={`size-20 ${state === "rec" ? "animate-pulse text-recording" : "opacity-60"}`} />
        )}
        {err && <p className="absolute inset-x-4 bottom-4 text-center text-sm">{err}</p>}
      </div>

      <div className="space-y-4 p-6">
        {state === "idle" && (
          <div className="mx-auto flex w-fit rounded-full bg-stage-muted p-1 text-sm">
            {(["video", "audio"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`flex items-center gap-1 rounded-full px-4 py-1.5 capitalize ${kind === k ? "bg-stage-foreground text-stage" : ""}`}
              >
                {k === "video" ? <Video className="size-4" /> : <Mic className="size-4" />} {k}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-center gap-6">
          {state === "idle" && <button className="rec-btn" aria-label="Start recording" onClick={start} />}
          {(state === "rec" || state === "paused") && (
            <>
              <button
                className="icon-btn-lg"
                aria-label={state === "rec" ? "Pause" : "Resume"}
                onClick={() => {
                  if (state === "rec") {
                    recRef.current?.pause();
                    setState("paused");
                  } else {
                    recRef.current?.resume();
                    setState("rec");
                  }
                }}
              >
                {state === "rec" ? <Pause /> : <Play />}
              </button>
              <button className="rec-btn rec-btn-stop" aria-label="Stop" onClick={() => recRef.current?.stop()}>
                <Square className="size-6 fill-current" />
              </button>
            </>
          )}
          {state === "review" && (
            <div className="flex w-full gap-3">
              <Button variant="outline" size="lg" className="flex-1" onClick={discard} disabled={saving}>
                Discard
              </Button>
              <Button size="lg" className="flex-1" onClick={save} disabled={saving}>
                {saving ? "Encrypting…" : "Save"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
