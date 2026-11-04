// Pure helpers that keep Whisper from looping on long or quiet audio.
export const GLITCH_NOTE = "[transcription glitch: repeated phrase collapsed]";
const RATE = 16000;
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();

/** Collapse any phrase (1–12 words) repeated more than 3 times in a row to one copy, flagged as a glitch. */
export function collapseRepeats(text: string): { text: string; glitch: boolean } {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let glitch = false;
  let i = 0;
  while (i < words.length) {
    let done = false;
    for (let size = 1; size <= 12 && i + size * 4 <= words.length; size++) {
      const unit = norm(words.slice(i, i + size).join(" "));
      if (!unit) continue;
      let reps = 1;
      while (i + (reps + 1) * size <= words.length && norm(words.slice(i + reps * size, i + (reps + 1) * size).join(" ")) === unit) reps++;
      if (reps > 3) {
        out.push(...words.slice(i, i + size), GLITCH_NOTE);
        i += reps * size; glitch = true; done = true; break;
      }
    }
    if (!done) { out.push(words[i]!); i++; }
  }
  return { text: out.join(" "), glitch };
}

/** Drop whole segments that just repeat the previous segment more than 3 times. */
export function collapseRepeatedSegments<T extends { text: string }>(segs: T[]): T[] {
  const out: T[] = [];
  let run = 0;
  for (const s of segs) {
    const prev = out[out.length - 1];
    if (prev && norm(prev.text.replace(GLITCH_NOTE, "")) === norm(s.text)) {
      run++;
      if (run === 3 && !prev.text.includes(GLITCH_NOTE)) prev.text = `${prev.text} ${GLITCH_NOTE}`;
      if (run >= 3) continue;
    } else run = 0;
    out.push(s);
  }
  return out;
}

const rms = (a: Float32Array, from: number, to: number) => {
  let sum = 0; const end = Math.min(to, a.length);
  for (let i = from; i < end; i++) sum += a[i]! * a[i]!;
  return Math.sqrt(sum / Math.max(1, end - from));
};

export const SILENCE_RMS = 0.006;
export function isSilent(a: Float32Array) {
  // Speech present if any 200 ms window rises above the threshold.
  const w = RATE / 5;
  for (let i = 0; i < a.length; i += w) if (rms(a, i, i + w) > SILENCE_RMS) return false;
  return true;
}

/** Split into ≤maxSec pieces, cutting at the quietest 100 ms in the last 6 s so words are not sliced. */
export function splitAtPauses(a: Float32Array, maxSec = 28): { start: number; end: number }[] {
  const max = maxSec * RATE, look = 6 * RATE, w = RATE / 10;
  const out: { start: number; end: number }[] = [];
  let start = 0;
  while (start < a.length) {
    if (a.length - start <= max) { out.push({ start, end: a.length }); break; }
    let cut = start + max, best = Infinity;
    for (let i = start + max - look; i + w <= start + max; i += w / 2) {
      const r = rms(a, i, i + w);
      if (r < best) { best = r; cut = i + w / 2; }
    }
    out.push({ start, end: cut });
    start = cut;
  }
  return out;
}
