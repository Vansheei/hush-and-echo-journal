import { t, useLanguage } from "@/lib/i18n";
import { createFileRoute, useBlocker, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Flashlight, FlashlightOff, Mic, Pause, Play, RefreshCw, Square, Video, X } from "lucide-react";
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
  useLanguage();
  const { key, setBusy, bump } = useVault();
  const nav = useNavigate();
  const [kind, setKind] = useState<"video" | "audio">("video");
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [state, setState] = useState<"idle" | "rec" | "paused" | "review">("idle");
  const [secs, setSecs] = useState(0);
  const [result, setResult] = useState<{ blob: Blob; url: string } | null>(null);
  const [err, setErr] = useState("");
  const [torch, setTorch] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [saving, setSaving] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const camera = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const preview = useRef<HTMLVideoElement>(null);
  const saved = useRef(false);
  const reviewUrl = useRef<string | null>(null);
  useBlocker({ shouldBlockFn: () => state !== "idle" && !saved.current, enableBeforeUnload: state !== "idle" && !saved.current });

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Stable callback avoids stopping the stream whenever the provider renders.
  useEffect(() => {
    return () => {
      const recorder = recRef.current;
      if (recorder) { recorder.onstop = null; recorder.ondataavailable = null; if (recorder.state !== "inactive") recorder.stop(); }
      if (reviewUrl.current) URL.revokeObjectURL(reviewUrl.current);
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
          ? { audio: true, video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: facing } }
          : { audio: true },
      )
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        streamRef.current = s;
        setTorch(false);
        const track = s.getVideoTracks()[0];
        const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
        setHasTorch(!!caps?.torch);
        if (camera.current) {
          camera.current.srcObject = kind === "video" ? s : null;
          void camera.current.play().catch(() => {});
        }
      })
      .catch(() => setErr("Camera or microphone permission is needed."));
    return () => {
      cancelled = true;
    };
  }, [kind, facing, state, stopStream]);

  // Paint the camera onto a canvas; front camera is flipped so the preview shows
  // the owner as others see them. Recording takes this same canvas stream, so the
  // saved video always matches what was on screen.
  useEffect(() => {
    if (kind !== "video" || state === "review") return;
    let raf = 0;
    const draw = () => {
      const video = camera.current, target = canvas.current;
      if (video && target && video.videoWidth > 0) {
        if (target.width !== video.videoWidth || target.height !== video.videoHeight) {
          target.width = video.videoWidth;
          target.height = video.videoHeight;
        }
        const ctx = target.getContext("2d");
        if (ctx) {
          ctx.save();
          if (facing === "user") { ctx.translate(target.width, 0); ctx.scale(-1, 1); }
          ctx.drawImage(video, 0, 0);
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [kind, facing, state]);

  useEffect(() => {
    if (state !== "rec") return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  // Hold the screen on while recording so the display timeout cannot cut a take short.
  useEffect(() => {
    if (state === "idle" || state === "review") return;
    let lock: WakeLockSentinel | null = null;
    let dropped = false;
    const acquire = () => navigator.wakeLock?.request("screen").then(l => { if (dropped) void l.release(); else lock = l; }).catch(() => {});
    const onVisible = () => { if (document.visibilityState === "visible" && !lock) void acquire(); };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => { dropped = true; document.removeEventListener("visibilitychange", onVisible); void lock?.release().catch(() => {}); lock = null; };
  }, [state]);

  function start() {
    const s = streamRef.current;
    if (!s) return;
    const mimeType =
      kind === "video"
        ? pick(["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"])
        : pick(["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]);
    // Video records the painted canvas (already flipped for the front camera) plus the mic.
    const recordStream =
      kind === "video" && canvas.current
        ? new MediaStream([...canvas.current.captureStream(30).getVideoTracks(), ...s.getAudioTracks()])
        : s;
    const rec = new MediaRecorder(recordStream, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: 1_500_000,
      audioBitsPerSecond: 96_000,
    });
    const parts: Blob[] = [];
    setBusy(true);
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(parts, { type: rec.mimeType || mimeType });
      const url = URL.createObjectURL(blob); reviewUrl.current = url;
      setResult({ blob, url });
      stopStream();
      setState("review");
    };
    rec.start(1000);
    recRef.current = rec;
    setSecs(0);
    setState("rec");
  }

  async function toggleTorch() {
    const next = !torch;
    const track = streamRef.current?.getVideoTracks()[0];
    // Real LED where the camera has one; otherwise a full-screen warm flash lights the face.
    if (hasTorch && track) {
      try { await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] }); }
      catch { setErr("The light could not be switched on."); return; }
    }
    setTorch(next);
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
    saved.current = true;
    bump();
      await nav({ to: "/" });
    } catch {
      setErr("Could not save. Your recording is still here; try again.");
      setSaving(false);
    }
  }

  const screenFlash = torch && !hasTorch && kind === "video" && state !== "review";

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-stage text-stage-foreground" style={{ paddingTop: "var(--safe-top)", paddingBottom: "var(--safe-bottom)", paddingLeft: "var(--safe-left)", paddingRight: "var(--safe-right)" }}>
      {/* Full-screen camera canvas; hidden raw camera element feeds it. */}
      <video ref={camera} autoPlay muted playsInline className="hidden" />
      {kind === "video" && state !== "review" && (
        <canvas ref={canvas} className="absolute inset-0 size-full object-cover" />
      )}
      {kind === "audio" && state !== "review" && (
        <div className="absolute inset-0 grid place-items-center">
          <Mic className={`size-24 ${state === "rec" ? "animate-pulse text-recording" : "opacity-60"}`} />
        </div>
      )}
      {state === "review" && result && (
        kind === "video" ? (
          <video src={result.url} controls playsInline className="absolute inset-0 size-full object-contain" />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <audio src={result.url} controls className="w-4/5" />
          </div>
        )
      )}
      {/* Front-flash: a thick warm-white frame lights the face and leaves the preview visible. */}
      {screenFlash && <div aria-hidden className="pointer-events-none absolute inset-0 z-20 border-[14vmax] border-solid" style={{ borderColor: "oklch(0.97 0.03 90)", boxShadow: "inset 0 0 6vmax 2vmax oklch(0.97 0.03 90 / 70%)" }} />}

      {/* Floating controls above the preview and the flash. */}
      <div className="relative z-30 flex items-center justify-between p-4">
        <Button variant="ghost" size="icon" className="icon-btn" aria-label={t("Close")} disabled={state !== "idle" || saving} onClick={() => nav({ to: "/" })}>
          <X className="size-5" />
        </Button>
        <span className="rounded-full bg-stage/60 px-3 py-1 font-mono text-lg tabular-nums">{fmtDuration(secs)}</span>
        {kind === "video" && state !== "review" ? (
          <div className="flex gap-1">
          <button className="icon-btn" aria-label={t(torch ? "Light off" : "Light on")} aria-pressed={torch} onClick={() => void toggleTorch()}>
            {torch ? <FlashlightOff className="size-5" /> : <Flashlight className="size-5" />}
          </button>
          <button
            disabled={state !== "idle"}
            className="icon-btn"
            aria-label={t("Switch camera")}
            onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
          >
            <RefreshCw className="size-5" />
          </button>
          </div>
        ) : (
          <span className="size-10" />
        )}
      </div>

      {err && <p className="relative z-30 mx-4 rounded-md bg-stage/70 p-2 text-center text-sm">{t(err)}</p>}
      <div className="flex-1" />

      <div className="relative z-30 space-y-4 p-6">
        {state === "idle" && (
          <div className="mx-auto flex w-fit rounded-full bg-stage/70 p-1 text-sm">
            {(["video", "audio"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`flex items-center gap-1 rounded-full px-4 py-1.5 capitalize ${kind === k ? "bg-stage-foreground text-stage" : ""}`}
              >
                {k === "video" ? <Video className="size-4" /> : <Mic className="size-4" />} {t(k === "video" ? "Video" : "Audio")}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-center gap-6">
          {state === "idle" && <button className="rec-btn" aria-label={t("Start recording")} onClick={start} />}
          {(state === "rec" || state === "paused") && (
            <>
              <button
                className="icon-btn-lg"
                aria-label={state === "rec" ? t("Pause") : t("Resume")}
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
              <button className="rec-btn rec-btn-stop" aria-label={t("Stop")} onClick={() => recRef.current?.stop()}>
                <Square className="size-6 fill-current" />
              </button>
            </>
          )}
          {state === "review" && (
            <div className="flex w-full gap-3">
              <Button variant="outline" size="lg" className="flex-1" onClick={discard} disabled={saving}>
                {t("Discard")}</Button>
              <Button size="lg" className="flex-1" onClick={save} disabled={saving}>
                {saving ? t("Encrypting…") : t("Save")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
