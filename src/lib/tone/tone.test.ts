import { expect, it } from "vitest";
import { framePitch, voiceCueAnalyzer } from "./index";

const SR = 16000;
function tone(sec: number, amp: number, hz = 150) {
  const a = new Float32Array(sec * SR);
  for (let i = 0; i < a.length; i++) a[i] = amp * Math.sin((2 * Math.PI * hz * i) / SR);
  return a;
}
function join(...parts: Float32Array[]) {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

it("estimates pitch of a steady tone", () => {
  expect(Math.abs((framePitch(tone(1, 0.5).subarray(0, 640), SR) ?? 0) - 150)).toBeLessThan(5);
});

it("flags long pauses, quieter voice and fast speech from audio and timestamps", () => {
  const audio = join(tone(3, 0.5), tone(3, 0.5), new Float32Array(3 * SR), tone(3, 0.05), tone(3, 0.5));
  const segs = [
    { start: 0, end: 3, text: "one two three four five six" },
    { start: 3, end: 6, text: "one two three four five six" },
    { start: 9, end: 12, text: "one two three four five six" },
    { start: 12, end: 15, text: "a b c d e f g h i j k l m n o" },
  ];
  const notes = voiceCueAnalyzer.analyze({ audio, sampleRate: SR, segments: segs });
  expect(notes.find((n) => n.startsWith("0:09"))).toMatch(/\[long pause\].*\[voice quieter\]/);
  expect(notes.find((n) => n.startsWith("0:12"))).toContain("[speaking fast]");
  expect(notes.some((n) => n.startsWith("0:00"))).toBe(false);
});
