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
    if (buf.sampleRate !== 16000) {
      throw new Error(`Expected 16000 Hz decoded audio; received ${buf.sampleRate} Hz. Transcription stopped to avoid incorrect speech speed.`);
    }
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
const RATE = 16000;
// Whisper loops on a fragment that starts or ends mid-word, so cut in the quietest
// 100ms within the last few seconds of a piece instead of exactly on the 30s mark.
const SEARCH_SEC = 6;
const WINDOW = Math.round(0.1 * RATE);
export function quietCut(audio: Float32Array, from: number, to: number) {
  const last = Math.min(to, audio.length);
  if (last - from <= WINDOW || last >= audio.length) return last;
  const energy = (start: number) => { let sum = 0; for (let i = start; i < start + WINDOW; i++) { const v = audio[i] ?? 0; sum += v * v; } return sum; };
  const earliest = Math.max(from + WINDOW, last - SEARCH_SEC * RATE);
  let bestAt = last, bestEnergy = Infinity;
  for (let start = earliest; start + WINDOW <= last; start += WINDOW) {
    const sum = energy(start);
    if (sum < bestEnergy) { bestEnergy = sum; bestAt = start + Math.floor(WINDOW / 2); }
  }
  // Only move the cut for a real pause; on uniform audio keep the full-length piece.
  return bestEnergy < energy(last - WINDOW) * 0.5 ? bestAt : last;
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
/** Whisper repetition loops emit one short phrase over and over; keep a single copy and say so. */
export function collapseRepeats(segments: Segment[], limit = 3): Segment[] {
  const out: Segment[] = [];
  for (let i = 0; i < segments.length; ) {
    const first = segments[i];
    if (!first) { i++; continue; }
    let run = 1;
    while (i + run < segments.length && norm(segments[i + run]?.text ?? "") === norm(first.text) && norm(first.text)) run++;
    const last = segments[i + run - 1] ?? first;
    out.push(run > limit
      ? { start: first.start, end: last.end, text: `${first.text} […repeated ${run} times, likely a transcription glitch]` }
      : { ...first });
    if (run > limit) i += run;
    else { i++; for (let k = 1; k < run; k++, i++) { const s = segments[i]; if (s) out.push({ ...s }); } }
  }
  return out;
}

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
  const step = PIECE_SEC * RATE;
  const total = Math.max(1, Math.ceil(audio.length / step));
  const segments: Segment[] = [];
  onProgress({ phase: "transcribe", pct: 0 });
  for (let from = 0, i = 0; from < audio.length; i++) {
    const to = quietCut(audio, from, from + step);
    const offset = from / RATE;
    const piece = audio.slice(from, to);
    const pieceEnd = offset + piece.length / RATE;
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
    from = to;
    onProgress({ phase: "transcribe", pct: Math.min(99, Math.round(((i + 1) / total) * 100)) });
  }
  onProgress({ phase: "transcribe", pct: 100 });
  // Caller owns decoded audio and wipes it after tone analysis. Keep the speech-only
  // worker/model alive across locking; it contains no vault key or diary history.
  return collapseRepeats(segments);
}
