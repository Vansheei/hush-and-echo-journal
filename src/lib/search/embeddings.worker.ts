/// <reference lib="webworker" />
import { pipeline, env } from "@huggingface/transformers";
import { durableModelCache } from "@/lib/transcription/model-cache";
env.allowLocalModels = false;
env.useBrowserCache = false;
env.useCustomCache = true;
env.customCache = durableModelCache();
let encoder: Awaited<ReturnType<typeof pipeline<"feature-extraction">>> | null = null;
export const EMBEDDING_MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
self.onmessage = async (event: MessageEvent<{ id: number; texts: string[] }>) => {
  const { id, texts } = event.data;
  try {
    encoder ??= await pipeline("feature-extraction", EMBEDDING_MODEL, { device: "wasm", dtype: "q8" });
    const output = await encoder(texts, { pooling: "mean", normalize: true });
    self.postMessage({ id, vectors: output.tolist() });
  } catch (e) { self.postMessage({ id, error: e instanceof Error ? e.message : "Local search model failed." }); }
};