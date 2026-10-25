// Public model weights only. Never place diary content or keys in this cache.
export const MODEL_CACHE = "diary-local-models-v1";
export const cachedModelFiles = new Set<string>();
export function durableModelCache() {
  return {
    async match(request: string | Request) {
      if (typeof caches === "undefined") return undefined;
      const response = await (await caches.open(MODEL_CACHE)).match(request);
      if (response) {
        const url = typeof request === "string" ? request : request.url;
        cachedModelFiles.add(url);
        const marker = "/resolve/main/";
        const path = url.includes(marker) ? url.split(marker)[1] : undefined;
        if (path) cachedModelFiles.add(path);
      }
      return response;
    },
    async put(request: string | Request, response: Response) {
      if (typeof caches === "undefined") throw new Error("Durable model storage is unavailable in this browser.");
      try { await (await caches.open(MODEL_CACHE)).put(request, response.clone()); }
      catch { throw new Error("Not enough device storage to keep the speech model. Free some space and try again."); }
    },
  };
}