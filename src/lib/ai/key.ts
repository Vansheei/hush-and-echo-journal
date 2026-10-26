// Anthropic key helpers: cleaning pasted text, a safe saved-key summary, and a content-free test call.
import { MODELS, type ModelChoice } from "./models";

/** Hidden characters phones and keyboards add when copying: zero-width, BOM, non-breaking space, any whitespace. */
const HIDDEN = /[\s\u00a0\u200b-\u200f\u2028\u2029\u202f\u2060\ufeff]/g;
const DASHES = /[\u2010-\u2015\u2212]/g;
export function sanitizeKey(raw: string) {
  const cleaned = raw.replace(HIDDEN, "").replace(DASHES, "-").replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, "");
  const changed = cleaned !== raw.trim();
  let problem = "";
  if (!cleaned.startsWith("sk-ant-")) problem = "This doesn't look like an Anthropic key. It should start with sk-ant-.";
  else if (!/^[A-Za-z0-9_-]+$/.test(cleaned)) problem = "The key contains characters an Anthropic key never has. Copy it again from the Anthropic console.";
  else if (cleaned.length < 40) problem = "The key looks too short. It may have been cut off while copying.";
  return { key: cleaned, changed, problem };
}

/** Only the character count, first six and last four characters, as the owner asked. Never the full key. */
export function keySummary(key: string) {
  return { length: key.length, start: key.slice(0, 6), end: key.length > 10 ? key.slice(-4) : "", hidden: HIDDEN.test(key) || /[^\x21-\x7e]/.test(key) };
}

export type ClaudeError = { status: number; type: string; message: string };
export function formatClaudeError(e: ClaudeError) {
  return `Anthropic error ${e.status}${e.type ? ` · ${e.type}` : ""} · ${e.message}`;
}
export async function readClaudeError(response: Response): Promise<string> {
  const raw = typeof response.text === "function" ? await response.text().catch(() => "")
    : JSON.stringify(await response.json().catch(() => null));
  let type = "", message = raw.trim();
  try { const data = JSON.parse(raw); type = data?.error?.type ?? ""; message = data?.error?.message ?? message; } catch { /* plain text */ }
  return formatClaudeError({ status: response.status, type, message: message || "No error text was returned." });
}

export function claudeHeaders(apiKey: string) {
  return { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" };
}

/** One tiny request with no diary content. Returns Anthropic's exact error text on failure. */
export async function testKey(apiKey: string, model: ModelChoice): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: claudeHeaders(apiKey),
      // Same shape as a real request, minus diary content, so a passing test means real calls work.
      body: JSON.stringify({ model: MODELS[model].id, max_tokens: 16, thinking: MODELS[model].thinkingOff, output_config: { effort: "low" }, messages: [{ role: "user", content: "Reply with OK." }] }),
    });
    if (!response.ok) return { ok: false, error: await readClaudeError(response) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Could not reach Anthropic: ${e instanceof Error ? e.message : String(e)}. Check the internet connection.` };
  }
}

// Last test outcome per model (no key material), so readiness can be shown.
const STATUS = "diary-claude-key-test";
export type KeyTest = { ok: boolean; at: number; error?: string; models: ModelChoice[] };
export const getKeyTest = (): KeyTest | null => { try { return JSON.parse(localStorage.getItem(STATUS) ?? "null"); } catch { return null; } };
export const setKeyTest = (v: KeyTest | null) => { if (v) localStorage.setItem(STATUS, JSON.stringify(v)); else localStorage.removeItem(STATUS); };
