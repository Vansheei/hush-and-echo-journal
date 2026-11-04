import { afterEach, expect, it, vi } from "vitest";
import { decodeToMono16k, transcribeAudio } from "./index";

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
  const speech = new Float32Array(65 * 16000).map((_, i) => Math.sin(i / 5) * 0.2);
  const segments = await transcribeAudio(speech, "base", progress);
  expect(lengths.reduce((a, b) => a + b, 0)).toBe(65 * 16000);
  for (const l of lengths) expect(l).toBeLessThanOrEqual(28 * 16000);
  expect(segments[0]!.start).toBe(0);
  expect(segments[segments.length - 1]!.end).toBe(65);
});

it("skips silent audio instead of sending it to Whisper", async () => {
  const posted = vi.fn();
  vi.stubGlobal("Worker", class { onmessage?: unknown; postMessage = posted; });
  expect(await transcribeAudio(new Float32Array(40 * 16000), "base", vi.fn())).toEqual([]);
  expect(posted).not.toHaveBeenCalled();
});