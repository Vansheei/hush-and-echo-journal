import { afterEach, expect, it, vi } from "vitest";
import { cachedModelFiles, durableModelCache, MODEL_CACHE } from "./model-cache";
afterEach(() => vi.unstubAllGlobals());
it("reuses durable model files with a new cache adapter after lock or worker recreation", async () => {
  const files = new Map(); const store = { match: vi.fn(async (url) => files.get(url)), put: vi.fn(async (url, response) => { files.set(url, response); }) };
  const open = vi.fn(async () => store); vi.stubGlobal("caches", { open });
  const response = { clone: () => ({ weights: "public model" }) } as unknown as Response;
  await durableModelCache().put("https://models.example/whisper-small/weights.onnx", response);
  expect(await durableModelCache().match("https://models.example/whisper-small/weights.onnx")).toEqual({ weights: "public model" });
  expect(open).toHaveBeenCalledWith(MODEL_CACHE); expect(store.put).toHaveBeenCalledTimes(1);
});
it("recognises cached weight files so loading them is not labelled downloading", async () => {
  vi.stubGlobal("caches", { open: async () => ({ match: async () => ({ cached: true }) }) });
  await durableModelCache().match("https://huggingface.co/onnx-community/whisper-small/resolve/main/onnx/encoder_model.onnx");
  expect(cachedModelFiles.has("onnx/encoder_model.onnx")).toBe(true);
});