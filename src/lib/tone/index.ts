import type { Segment } from "@/lib/storage/db";

export type ToneInput = { audio: Float32Array; sampleRate: number; segments: Segment[] };
/** Swappable: any analyzer returns short, uncertain notes. Never a diagnosis. */
export interface ToneAnalyzer { analyze(input: ToneInput): string[] }

type Stats = { start: number; rate: number; db: number; pitchCv: number | null; gapBefore: number };

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
};
const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

/** Autocorrelation pitch estimate for one frame (75–400 Hz), or null when unvoiced. */
export function framePitch(frame: Float32Array, sr: number): number | null {
  let energy = 0;
  for (let i = 0; i < frame.length; i++) energy += frame[i] * frame[i];
  if (Math.sqrt(energy / frame.length) < 0.01) return null;
  const minLag = Math.floor(sr / 400), maxLag = Math.floor(sr / 75);
  let best = 0, bestLag = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let c = 0;
    for (let i = 0; i + lag < frame.length; i++) c += frame[i] * frame[i + lag];
    if (c > best) { best = c; bestLag = lag; }
  }
  return bestLag && best / energy > 0.3 ? sr / bestLag : null;
}

function segmentStats(audio: Float32Array, sr: number, seg: Segment, prevEnd: number): Stats {
  const a = Math.max(0, Math.floor(seg.start * sr)), b = Math.min(audio.length, Math.floor(seg.end * sr));
  const slice = audio.subarray(a, b);
  let sum = 0;
  for (let i = 0; i < slice.length; i++) sum += slice[i] * slice[i];
  const rms = Math.sqrt(sum / Math.max(1, slice.length));
  const frame = Math.floor(sr * 0.04), pitches: number[] = [];
  for (let i = 0; i + frame <= slice.length; i += frame) {
    const p = framePitch(slice.subarray(i, i + frame), sr);
    if (p) pitches.push(p);
  }
  let pitchCv: number | null = null;
  if (pitches.length >= 5) {
    const mean = pitches.reduce((x, y) => x + y, 0) / pitches.length;
    const sd = Math.sqrt(pitches.reduce((x, y) => x + (y - mean) ** 2, 0) / pitches.length);
    pitchCv = sd / mean;
  }
  const words = seg.text.trim().split(/\s+/).filter(Boolean).length;
  return {
    start: seg.start,
    rate: words / Math.max(0.5, seg.end - seg.start),
    db: 20 * Math.log10(rms + 1e-9),
    pitchCv,
    gapBefore: seg.start - prevEnd,
  };
}

/** Voice-based cues from Whisper timestamps + raw audio: pace, pauses, loudness, pitch steadiness. */
export const voiceCueAnalyzer: ToneAnalyzer = {
  analyze({ audio, sampleRate, segments }) {
    const segs = segments.filter((s) => s.end > s.start && s.text.trim());
    if (!segs.length) return [];
    const stats = segs.map((s, i) => segmentStats(audio, sampleRate, s, i ? segs[i - 1].end : s.start));
    const rate = median(stats.map((s) => s.rate)), db = median(stats.map((s) => s.db));
    const cvs = stats.map((s) => s.pitchCv).filter((x): x is number => x !== null);
    const cv = median(cvs);
    const notes: string[] = [];
    for (const s of stats) {
      const tags: string[] = [];
      if (s.gapBefore >= 2.5) tags.push("[long pause]");
      if (stats.length > 1 && s.rate > rate * 1.35 && s.rate > 2.8) tags.push("[speaking fast]");
      if (stats.length > 1 && s.rate < rate * 0.65) tags.push("[speaking slowly]");
      if (stats.length > 1 && s.db < db - 6) tags.push("[voice quieter]");
      if (stats.length > 1 && s.db > db + 6) tags.push("[voice louder]");
      if (s.pitchCv !== null && cvs.length > 1 && s.pitchCv > Math.max(cv * 1.5, 0.15)) tags.push("[pitch unsteady]");
      if (tags.length) notes.push(`${fmt(s.start)} ${tags.join(" ")}`);
    }
    return notes;
  },
};

export const defaultToneAnalyzer: ToneAnalyzer = voiceCueAnalyzer;
