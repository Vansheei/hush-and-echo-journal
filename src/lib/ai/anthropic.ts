import { MODELS, type ModelChoice } from "./models";
import { PERSONALITY } from "./personality";
import type { Suggestions } from "@/lib/storage/personal";

export type Reflection = { text: string; looseEnds: string[]; worries: string[]; suggestions?: Suggestions };
export async function requestReflection(input: {
  confirmed: boolean; mode: "listen" | "reflect"; apiKey: string; text: string;
  model: ModelChoice; signal: AbortSignal;
  context?: string; conversation?: { role: "user" | "assistant"; content: string }[]; approach?: string;
}): Promise<Reflection> {
  if (!input.confirmed || input.mode !== "reflect") throw new Error("Explicit reflection confirmation is required.");
  if (!input.apiKey || !input.text.trim()) throw new Error("A key and transcript are required.");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", signal: input.signal,
    headers: { "content-type": "application/json", "x-api-key": input.apiKey,
      "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: MODELS[input.model].id, max_tokens: 900,
      system: `${PERSONALITY}\nApproach: ${input.approach ?? "brief reflection"}. Return only JSON: {"text":"reply", "looseEnds":[], "worries":[], "meanings":[{"phrase":"unclear phrase","meaning":"tentative meaning","language":"language"}], "people":[{"mention":"name","question":"clarifying question"}], "notes":[{"kind":"fact","text":"something learned about the owner, fact or interpretation"}]}. Suggest notes only when you genuinely learned something about the owner; leave suggestions empty unless needed.\n${input.context ?? ""}`,
      messages: [...(input.conversation ?? []), { role: "user", content: input.text }] }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error?.message ?? `Claude request failed (${response.status}). No other model was used.`);
  }
  const data = await response.json();
  if (data.stop_reason === "refusal") throw new Error("Claude declined this request. Nothing else was sent.");
  const text = (data.content ?? []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("\n");
  if (!text.trim()) throw new Error("Claude returned no text. The request has stopped.");
  let result: unknown;
  try { result = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")); }
  catch { return { text, looseEnds: [], worries: [] }; }
  if (!result || typeof result !== "object" || !("text" in result) || typeof result.text !== "string") {
    return { text, looseEnds: [], worries: [] };
  }
  const list = (v: unknown) => Array.isArray(v) ? v.filter((s): s is string => typeof s === "string").slice(0, 8) : [];
  const meanings = "meanings" in result && Array.isArray(result.meanings) ? result.meanings.filter((v): v is Suggestions["meanings"][number] => v && typeof v.phrase === "string" && typeof v.meaning === "string" && typeof v.language === "string").slice(0, 8) : [];
  const people = "people" in result && Array.isArray(result.people) ? result.people.filter((v): v is Suggestions["people"][number] => v && typeof v.mention === "string" && typeof v.question === "string").slice(0, 8) : [];
  const notes = "notes" in result && Array.isArray(result.notes) ? result.notes.filter((v): v is Suggestions["notes"][number] => v && (v.kind === "fact" || v.kind === "interpretation") && typeof v.text === "string").slice(0, 8) : [];
  return { text: result.text, looseEnds: list("looseEnds" in result ? result.looseEnds : []), worries: list("worries" in result ? result.worries : []), suggestions: { meanings, people, notes } };
}
