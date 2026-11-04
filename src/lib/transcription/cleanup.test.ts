import { describe, expect, it } from "vitest";
import { collapseRepeats, collapseRepeatedSegments, GLITCH_NOTE, isSilent, splitAtPauses } from "./cleanup";

describe("repetition guard", () => {
  it("collapses a phrase repeated more than three times and flags it", () => {
    const r = collapseRepeats(`I went out. ${"Like this. ".repeat(90)}Then home.`);
    expect(r.glitch).toBe(true);
    expect(r.text).toBe(`I went out. Like this. ${GLITCH_NOTE} Then home.`);
  });
  it("keeps a phrase repeated exactly three times", () => {
    const r = collapseRepeats("no no no");
    expect(r).toEqual({ text: "no no no", glitch: false });
  });
  it("collapses repeated segments after three copies", () => {
    const segs = Array.from({ length: 10 }, () => ({ text: "Like this." }));
    const out = collapseRepeatedSegments([...segs, { text: "Real sentence." }]);
    expect(out.map(s => s.text)).toEqual(["Like this.", "Like this.", `Like this. ${GLITCH_NOTE}`, "Real sentence."]);
  });
});

describe("silence and chunking", () => {
  it("detects silence and speech", () => {
    expect(isSilent(new Float32Array(16000))).toBe(true);
    const loud = new Float32Array(16000).map((_, i) => Math.sin(i / 5) * 0.2);
    expect(isSilent(loud)).toBe(false);
  });
  it("splits long audio into pieces of at most 28 s covering everything", () => {
    const a = new Float32Array(16000 * 74).map((_, i) => Math.sin(i / 5) * 0.2);
    const parts = splitAtPauses(a);
    expect(parts[0]!.start).toBe(0);
    expect(parts[parts.length - 1]!.end).toBe(a.length);
    for (const p of parts) expect(p.end - p.start).toBeLessThanOrEqual(28 * 16000);
  });
});
