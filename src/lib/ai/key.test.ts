import { afterEach, expect, it, vi } from "vitest";
import { keySummary, sanitizeKey, testKey } from "./key";
import { requestReflection } from "./anthropic";
afterEach(() => vi.unstubAllGlobals());
const real = "sk-ant-api03-" + "A".repeat(80) + "wxyz";

it("removes hidden characters anywhere and leaves a clean key unchanged", () => {
  expect(sanitizeKey(real)).toEqual({ key: real, changed: false, problem: "" });
  const dirty = ` ${real.slice(0, 20)}\u200b${real.slice(20, 40)}\n${real.slice(40)}\u00a0`;
  expect(sanitizeKey(dirty).key).toBe(real);
  expect(sanitizeKey(dirty).changed).toBe(true);
});
it("rejects text that is not an Anthropic key", () => {
  expect(sanitizeKey("hello").problem).not.toBe("");
  expect(sanitizeKey("sk-ant-short").problem).not.toBe("");
});
it("summary shows only count, first six and last four", () => {
  expect(keySummary(real)).toEqual({ length: real.length, start: "sk-ant", end: "wxyz", hidden: false });
});
it("sends the exact Anthropic headers and shows Anthropic's own error", async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }) });
  vi.stubGlobal("fetch", fetcher);
  expect(await testKey(real, "haiku")).toEqual({ ok: false, error: "Anthropic error 401 · authentication_error · invalid x-api-key" });
  const headers = fetcher.mock.calls[0]?.[1].headers;
  expect(headers).toEqual({ "content-type": "application/json", "x-api-key": real, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" });
  await expect(requestReflection({ confirmed: true, mode: "reflect", apiKey: real, text: "hi", model: "haiku", signal: new AbortController().signal })).rejects.toThrow("401 · authentication_error · invalid x-api-key");
});
