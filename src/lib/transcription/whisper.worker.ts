/// <reference lib="webworker" />
import { pipeline, env } from "@huggingface/transformers";
import { durableModelCache } from "./model-cache";

env.allowLocalModels = false;
env.useBrowserCache = false;
env.useCustomCache = true;
env.customCache = durableModelCache();

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
  const id = model === "small" ? "onnx-community/whisper-small" : "onnx-community/whisper-base";
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
      if (x.status === "progress") self.postMessage({ id, type: "download", progress: x.progress ?? 0 });
    });
    const out = await p(audio, { return_timestamps: true, task: "transcribe" });
    audio.fill(0);
    self.postMessage({ id, type: "result", out });
  } catch (err) {
    audio.fill(0);
    self.postMessage({ id, type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
