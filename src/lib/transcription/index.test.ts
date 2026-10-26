import { afterEach, describe, expect, it, vi } from "vitest";
import { collapseRepeats, decodeToMono16k, quietCut, transcribeAudio } from "./index";

afterEach(() => vi.unstubAllGlobals());

it("downmixes decoded 16kHz stereo without dropping duration", async () => {
  const close = vi.fn();
  class AudioContextMock {
    constructor(options: { sampleRate: number }) { expect(options.sampleRate).toBe(16000); }
    async decodeAudioData() {
      return { sampleRate: 16000, length: 16000 * 65, numberOfChannels: 2,
        getChannelData: (channel: number) => new Float32Array(16000 * 65).fill(channel === 0 ? 0.5 : 0.25) };
    }
    close = close;
  }
  vi.stubGlobal("AudioContext", AudioContextMock);
  const audio = await decodeToMono16k({ arrayBuffer: async () => new ArrayBuffer(1) } as Blob);
  expect(audio.length / 16000).toBe(65);
  expect(audio[0]).toBe(0.375);
  expect(close).toHaveBeenCalledOnce();
});

it("rejects a WebView decode at the wrong sample rate rather than feeding sped-up speech to Whisper", async () => {
  const close = vi.fn();
  vi.stubGlobal("AudioContext", class {
    async decodeAudioData() { return { sampleRate: 48000 }; }
    close = close;
  });
  await expect(decodeToMono16k({ arrayBuffer: async () => new ArrayBuffer(1) } as Blob)).rejects.toThrow("16000 Hz");
  expect(close).toHaveBeenCalledOnce();
});

it("transcribes every piece of a 65-second recording with timestamps across the full duration", async () => {
  const lengths: number[] = [];
  class WorkerMock {
    onmessage?: (event: { data: unknown }) => void;
    postMessage({ id, audio }: { id: number; audio: Float32Array }) {
      lengths.push(audio.length);
      queueMicrotask(() => this.onmessage?.({ data: { id, type: "result", out: { text: `piece ${lengths.length}` } } }));
    }
  }
  vi.stubGlobal("Worker", WorkerMock);
  const progress = vi.fn();
  const segments = await transcribeAudio(new Float32Array(65 * 16000), "base", progress);
  expect(lengths).toEqual([30 * 16000, 30 * 16000, 5 * 16000]);
  expect(segments.map(({ start, end }) => [start, end])).toEqual([[0, 30], [30, 60], [60, 65]]);
  expect(progress).toHaveBeenLastCalledWith({ phase: "transcribe", pct: 100 });
});
describe("long-audio handling", () => {
  it("cuts at the quietest point near the end, not exactly on the 30s mark", () => {
    const audio = new Float32Array(40 * 16000).fill(0.5);
    const silenceAt = 27 * 16000;
    audio.fill(0, silenceAt, silenceAt + 1600);
    const cut = quietCut(audio, 0, 30 * 16000);
    expect(cut).toBeGreaterThan(silenceAt - 1600);
    expect(cut).toBeLessThan(silenceAt + 3200);
  });
  it("never cuts short when the rest of the audio fits in one piece", () => {
    const audio = new Float32Array(10 * 16000).fill(0.5);
    expect(quietCut(audio, 0, 30 * 16000)).toBe(audio.length);
  });
  it("collapses a repetition loop into one line and names it a glitch", () => {
    const loop = Array.from({ length: 90 }, (_, i) => ({ start: i, end: i + 1, text: "Like this." }));
    const out = collapseRepeats([{ start: 0, end: 1, text: "Real sentence." }, ...loop, { start: 91, end: 92, text: "After." }]);
    expect(out.map(s => s.text)).toEqual(["Real sentence.", "Like this. […repeated 90 times, likely a transcription glitch]", "After."]);
    expect(out[1]?.end).toBe(90);
  });
  it("leaves a short run of repeats alone", () => {
    const segments = [{ start: 0, end: 1, text: "Yes." }, { start: 1, end: 2, text: "Yes." }];
    expect(collapseRepeats(segments)).toEqual(segments);
  });
});
