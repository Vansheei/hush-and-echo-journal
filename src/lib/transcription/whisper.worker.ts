/// <reference lib="webworker" />
import { pipeline, env } from "@huggingface/transformers";
import { cachedModelFiles, durableModelCache } from "./model-cache";

env.allowLocalModels = false;
env.useBrowserCache = false;
env.useCustomCache = true;
env.customCache = durableModelCache();

// ONNX Runtime's WASM backend runs single-threaded unless the page is cross-origin
// isolated, which is the difference between roughly realtime and many times slower.
// Ask for every core when isolation allows threads, and keep SIMD on either way.
const wasm = env.backends?.onnx?.wasm;
if (wasm) {
  const threads = typeof self.crossOriginIsolated === "boolean" && self.crossOriginIsolated
    ? Math.max(1, Math.min(4, navigator.hardwareConcurrency || 1)) : 1;
  wasm.numThreads = threads;
  wasm.simd = true;
  wasm.proxy = false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pipe: any = null;
let loaded = "";

async function hasWebGPU() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gpu = (navigator as any).gpu;
    return !!(gpu && (await gpu.requestAdapter()));
  } catch {
    return false;
  }
}

async function getPipe(model: string, onProgress: (x: { status: string; progress?: number }) => void) {
  if (pipe && loaded === model) return pipe;
  const id = model === "small" ? "onnx-community/whisper-small" : model === "base" ? "onnx-community/whisper-base" : "onnx-community/whisper-tiny";
  const gpu = await hasWebGPU();
  const opts = { progress_callback: onProgress };
  try {
    pipe = gpu
      ? await pipeline("automatic-speech-recognition", id, {
          ...opts,
          device: "webgpu",
          dtype: { encoder_model: "fp32", decoder_model_merged: "q4" },
        })
      : await pipeline("automatic-speech-recognition", id, { ...opts, device: "wasm", dtype: "q8" });
  } catch (e) {
    if (!gpu) throw e;
    pipe = await pipeline("automatic-speech-recognition", id, { ...opts, device: "wasm", dtype: "q8" });
  }
  loaded = model;
  return pipe;
}

self.onmessage = async (e: MessageEvent) => {
  const { id, model, audio } = e.data as { id: number; model: string; audio: Float32Array };
  try {
    const p = await getPipe(model, (x) => {
      const file = "file" in x && typeof x.file === "string" ? x.file : "";
      if (x.status === "progress" && !cachedModelFiles.has(file)) self.postMessage({ id, type: "download", progress: x.progress ?? 0 });
    });
    const out = await p(audio, { return_timestamps: true, task: "transcribe" });
    audio.fill(0);
    self.postMessage({ id, type: "result", out });
  } catch (err) {
    audio.fill(0);
    self.postMessage({ id, type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
