import { openDB, type IDBPDatabase } from "idb";
import { decryptBytes, decryptJSON, encryptBytes, encryptJSON, type Enc, type VaultMeta } from "@/lib/crypto/vault";

let dbp: Promise<IDBPDatabase> | null = null;
export function db() {
  if (!dbp)
    dbp = openDB("diary", 1, {
      upgrade(d) {
        d.createObjectStore("meta");
        d.createObjectStore("entries", { keyPath: "id" });
        d.createObjectStore("media", { keyPath: "id" }).createIndex("entryId", "entryId");
      },
    });
  return dbp;
}

export const getVaultMeta = async () => (await (await db()).get("meta", "vault")) as VaultMeta | undefined;
export const putVaultMeta = async (m: VaultMeta) => (await db()).put("meta", m, "vault");

// ---- Settings (encrypted) ----
export type WhisperModel = "base" | "small";
export type Settings = { autoLockMin: number; whisperModel: WhisperModel };
export const DEFAULT_SETTINGS: Settings = { autoLockMin: 5, whisperModel: "base" };

export async function getSettings(key: CryptoKey): Promise<Settings> {
  const e = (await (await db()).get("meta", "settings")) as Enc | undefined;
  return e ? { ...DEFAULT_SETTINGS, ...(await decryptJSON<Settings>(key, e)) } : DEFAULT_SETTINGS;
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
  error?: string;
  segments: Segment[];
};

const CHUNK = 1024 * 1024;

export async function putEntry(key: CryptoKey, e: Entry) {
  await (await db()).put("entries", { id: e.id, data: await encryptJSON(key, e) });
}

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
