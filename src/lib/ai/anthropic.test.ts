import { afterEach, expect, it, vi } from "vitest";
import { requestReflection } from "./anthropic";
import { MODEL_DEFAULTS, MODELS } from "./models";
afterEach(() => vi.unstubAllGlobals());
const input = { confirmed: true, mode: "reflect" as const, apiKey: "test-key", text: "My text", model: "haiku" as const, signal: new AbortController().signal };
it("Listen is silent even with confirmation", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  await expect(requestReflection({ ...input, mode: "listen" })).rejects.toThrow(); expect(fetcher).not.toHaveBeenCalled();
});
it("requires explicit confirmation", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  await expect(requestReflection({ ...input, confirmed: false })).rejects.toThrow(); expect(fetcher).not.toHaveBeenCalled();
});
it("uses the exact 5.5 IDs and feature routing", () => {
  expect(MODELS.haiku.id).toBe("claude-haiku-5-5"); expect(MODELS.sonnet.id).toBe("claude-sonnet-5-5");
  expect(MODEL_DEFAULTS).toEqual({ extraction: "haiku", tagging: "haiku", notebook: "haiku", reflection: "haiku", companion: "sonnet", recap: "sonnet", drafts: "sonnet" });
});
it("never falls back after a rejected model", async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: { message: "Model rejected" } }) }); vi.stubGlobal("fetch", fetcher);
  await expect(requestReflection(input)).rejects.toThrow("Model rejected"); expect(fetcher).toHaveBeenCalledTimes(1);
  const call = fetcher.mock.calls[0];
  if (!call) throw new Error("Expected one request");
  expect(JSON.parse(call[1].body).model).toBe("claude-haiku-5-5");
});
it("sends confirmed glossary and ambiguity instructions on reflection without saving suggestions", async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ content: [{ type: "text", text: JSON.stringify({ text: "Who do you mean by Mama?", meanings: [], people: [{ mention: "Mama", question: "Your mum or maternal uncle?" }] }) }] }) });
  vi.stubGlobal("fetch", fetcher);
  const result = await requestReflection({ ...input, context: "koot dungi: I'll beat you (Punjabi)" });
  const body = JSON.parse(fetcher.mock.calls[0]?.[1].body);
  expect(body.system).toContain("koot dungi"); expect(body.system).toContain("80 percent"); expect(body.system).toContain("Swearing"); expect(body.system).toContain("never assume or create people");
  expect(result.suggestions?.people[0]?.question).toBe("Your mum or maternal uncle?"); expect(fetcher).toHaveBeenCalledTimes(1);
});
it("parses suggested notes marked as fact or interpretation, dropping invalid ones", async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ content: [{ type: "text", text: JSON.stringify({ text: "Noted.", notes: [{ kind: "fact", text: "Has a dog named Bruno" }, { kind: "interpretation", text: "Seems to dread Sundays" }, { kind: "guess", text: "bad" }, { kind: "fact" }] }) }] }) });
  vi.stubGlobal("fetch", fetcher);
  const result = await requestReflection(input);
  expect(result.suggestions?.notes).toEqual([{ kind: "fact", text: "Has a dog named Bruno" }, { kind: "interpretation", text: "Seems to dread Sundays" }]);
});
it("stops on an empty refusal without retrying", async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ stop_reason: "refusal", content: [] }) }); vi.stubGlobal("fetch", fetcher);
  await expect(requestReflection(input)).rejects.toThrow("declined"); expect(fetcher).toHaveBeenCalledTimes(1);
});