// Local, on-device transcription. Audio never leaves the phone.
import type { Segment, WhisperModel } from "@/lib/storage/db";

export type TranscribeProgress = { phase: "download" | "transcribe"; pct: number };

type Out = { text: string; chunks?: { timestamp: [number, number | null]; text: string }[] };
let worker: Worker | null = null;
let seq = 0;
const handlers = new Map<number, { resolve: (o: Out) => void; reject: (e: Error) => void; dl: (p: number) => void }>();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./whisper.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e) => {
      const h = handlers.get(e.data.id);
      if (!h) return;
      if (e.data.type === "download") h.dl(e.data.progress);
      else {
        handlers.delete(e.data.id);
        if (e.data.type === "result") h.resolve(e.data.out);
        else h.reject(new Error(e.data.message));
      }
    };
    const fail = () => {
      for (const h of handlers.values()) h.reject(new Error("Speech worker stopped. Please retry transcription."));
      handlers.clear(); worker?.terminate(); worker = null;
    };
    worker.onerror = fail;
    worker.onmessageerror = fail;
  }
  return worker;
}

function runPiece(audio: Float32Array, model: WhisperModel, dl: (p: number) => void) {
  return new Promise<Out>((resolve, reject) => {
    const id = ++seq;
    handlers.set(id, { resolve, reject, dl });
    getWorker().postMessage({ id, model, audio }, [audio.buffer]);
  });
}

export async function decodeToMono16k(blob: Blob): Promise<Float32Array> {
  const ctx = new AudioContext({ sampleRate: 16000 });
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const out = new Float32Array(buf.length);
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < ch.length; i++) out[i] = (out[i] ?? 0) + (ch[i] ?? 0) / buf.numberOfChannels;
    }
    return out;
  } finally {
    void ctx.close();
  }
}

const PIECE_SEC = 30;

export async function transcribe(
  blob: Blob,
  model: WhisperModel,
  onProgress: (p: TranscribeProgress) => void,
): Promise<Segment[]> {
  const audio = await decodeToMono16k(blob);
  try { return await transcribeAudio(audio, model, onProgress); }
  finally { audio.fill(0); }
}

export async function transcribeAudio(audio: Float32Array, model: WhisperModel, onProgress: (p: TranscribeProgress) => void): Promise<Segment[]> {
  const step = PIECE_SEC * 16000;
  const n = Math.max(1, Math.ceil(audio.length / step));
  const segments: Segment[] = [];
  onProgress({ phase: "transcribe", pct: 0 });
  for (let i = 0; i < n; i++) {
    const offset = i * PIECE_SEC;
    const piece = audio.slice(i * step, (i + 1) * step);
    const pieceEnd = offset + piece.length / 16000;
    const out = await runPiece(piece, model, (p) => onProgress({ phase: "download", pct: p }));
    const chunks = out.chunks?.length ? out.chunks : [{ timestamp: [0, null] as [number, null], text: out.text }];
    for (const c of chunks) {
      const text = c.text.trim();
      if (!text) continue;
      segments.push({
        start: offset + (c.timestamp[0] ?? 0),
        end: Math.min(pieceEnd, c.timestamp[1] != null ? offset + c.timestamp[1] : pieceEnd),
        text,
      });
    }
    onProgress({ phase: "transcribe", pct: Math.round(((i + 1) / n) * 100) });
  }
  // Caller owns decoded audio and wipes it after tone analysis. Keep the speech-only
  // worker/model alive across locking; it contains no vault key or diary history.
  return segments;
}
