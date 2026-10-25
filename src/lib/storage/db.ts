import { openDB, type IDBPDatabase } from "idb";
import { decryptBytes, decryptJSON, encryptBytes, encryptJSON, type Enc, type VaultMeta } from "@/lib/crypto/vault";
import { MODEL_DEFAULTS, type Feature, type ModelChoice } from "@/lib/ai/models";
import type { Reflection } from "@/lib/ai/anthropic";

let dbp: Promise<IDBPDatabase> | null = null;
export function db() {
  if (!dbp)
    dbp = openDB("diary", 2, {
      upgrade(d, oldVersion) {
        if (oldVersion < 1) {
          d.createObjectStore("meta");
          d.createObjectStore("entries", { keyPath: "id" });
          d.createObjectStore("media", { keyPath: "id" }).createIndex("entryId", "entryId");
        }
        if (oldVersion < 2) d.createObjectStore("items", { keyPath: "id" });
      },
    });
  return dbp;
}

export const getVaultMeta = async () => (await (await db()).get("meta", "vault")) as VaultMeta | undefined;
export const putVaultMeta = async (m: VaultMeta) => (await db()).put("meta", m, "vault");

// ---- Settings (encrypted) ----
export type WhisperModel = "base" | "small";
export type Settings = { autoLockMin: number; whisperModel: WhisperModel; mode: "listen" | "reflect"; models: Record<Feature, ModelChoice> };
export const DEFAULT_SETTINGS: Settings = { autoLockMin: 5, whisperModel: "base", mode: "listen", models: MODEL_DEFAULTS };

export async function getSettings(key: CryptoKey): Promise<Settings> {
  const e = (await (await db()).get("meta", "settings")) as Enc | undefined;
  const saved = e ? await decryptJSON<Partial<Settings>>(key, e) : {};
  return { ...DEFAULT_SETTINGS, ...saved, models: { ...MODEL_DEFAULTS, ...saved.models } };
}
export async function putSettings(key: CryptoKey, s: Settings) {
  await (await db()).put("meta", await encryptJSON(key, s), "settings");
}

// ---- Entries ----
export type Segment = { start: number; end: number; text: string };
export type EntryStatus = "pending" | "transcribing" | "done" | "error";
export type Entry = {
  id: string;
  createdAt: number;
  kind: "audio" | "video";
  mimeType: string;
  durationSec: number;
  size: number;
  chunkCount: number;
  status: EntryStatus;
  error?: string | undefined;
  segments: Segment[];
  toneNotes?: string[];
  mode?: "listen" | "reflect";
  reflection?: Reflection;
};

const CHUNK = 1024 * 1024;

export async function putEntry(key: CryptoKey, e: Entry) {
  const revision = crypto.randomUUID();
  await (await db()).put("entries", { id: e.id, revision, data: await encryptJSON(key, e) });
  return revision;
}

export async function completeEntry(key: CryptoKey, e: Entry, revision: string) {
  const data = await encryptJSON(key, e);
  const tx = (await db()).transaction("entries", "readwrite");
  const row = await tx.store.get(e.id);
  if (row?.revision === revision) await tx.store.put({ id: e.id, revision: crypto.randomUUID(), data });
  await tx.done;
}

export async function getApiKey(key: CryptoKey): Promise<string> {
  const value = await (await db()).get("meta", "anthropicKey");
  return value ? decryptJSON<string>(key, value) : "";
}
export async function putApiKey(key: CryptoKey, value: string) {
  if (value) await (await db()).put("meta", await encryptJSON(key, value), "anthropicKey");
  else await (await db()).delete("meta", "anthropicKey");
}

export type DiaryItem = { id: string; kind: "loose" | "worry"; text: string; closed: boolean; createdAt: number; entryId?: string };
export async function putItem(key: CryptoKey, item: DiaryItem) {
  await (await db()).put("items", { id: item.id, data: await encryptJSON(key, item) });
}
export async function listItems(key: CryptoKey): Promise<DiaryItem[]> {
  const rows = await (await db()).getAll("items");
  return Promise.all(rows.map((row) => decryptJSON<DiaryItem>(key, row.data)));
}
export async function deleteItem(id: string) { await (await db()).delete("items", id); }

export async function saveEntry(
  key: CryptoKey,
  blob: Blob,
  info: Pick<Entry, "kind" | "mimeType" | "durationSec">,
): Promise<Entry> {
  const id = crypto.randomUUID();
  const d = await db();
  const chunkCount = Math.max(1, Math.ceil(blob.size / CHUNK));
  for (let i = 0; i < chunkCount; i++) {
    const buf = await blob.slice(i * CHUNK, (i + 1) * CHUNK).arrayBuffer();
    await d.put("media", { id: `${id}:${i}`, entryId: id, idx: i, data: await encryptBytes(key, buf) });
  }
  const entry: Entry = { ...info, id, createdAt: Date.now(), size: blob.size, chunkCount, status: "pending", segments: [] };
  await putEntry(key, entry);
  return entry;
}

export async function listEntries(key: CryptoKey): Promise<Entry[]> {
  const rows = (await (await db()).getAll("entries")) as { data: Enc }[];
  const out = await Promise.all(rows.map((r) => decryptJSON<Entry>(key, r.data)));
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getEntry(key: CryptoKey, id: string) {
  const r = (await (await db()).get("entries", id)) as { data: Enc } | undefined;
  return r ? decryptJSON<Entry>(key, r.data) : undefined;
}

export async function loadMedia(key: CryptoKey, e: Entry): Promise<Blob> {
  const rows = (await (await db()).getAllFromIndex("media", "entryId", e.id)) as { idx: number; data: Enc }[];
  rows.sort((a, b) => a.idx - b.idx);
  const parts = await Promise.all(rows.map((r) => decryptBytes(key, r.data)));
  return new Blob(parts, { type: e.mimeType });
}

export async function deleteEntry(id: string) {
  const d = await db();
  const tx = d.transaction(["entries", "media"], "readwrite");
  const keys = await tx.objectStore("media").index("entryId").getAllKeys(id);
  await Promise.all([...keys.map((k) => tx.objectStore("media").delete(k)), tx.objectStore("entries").delete(id), tx.done]);
}
