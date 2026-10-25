import { db } from "./db";

const encode = (v: unknown): unknown => {
  if (v instanceof ArrayBuffer) return { binary: Array.from(new Uint8Array(v)) };
  if (v instanceof Uint8Array) return { bytes: Array.from(v) };
  if (Array.isArray(v)) return v.map(encode);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encode(x)]));
  return v;
};
export function decodeBackupValue(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(decodeBackupValue);
  if (v && typeof v === "object") {
    if ("binary" in v && Array.isArray(v.binary)) return new Uint8Array(v.binary).buffer;
    if ("bytes" in v && Array.isArray(v.bytes)) return new Uint8Array(v.bytes);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, decodeBackupValue(x)]));
  }
  return v;
}
export async function exportBackup(): Promise<Blob> {
  const database = await db();
  const names = ["meta", "entries", "media", "items"];
  const tx = database.transaction(names, "readonly");
  const stores = await Promise.all(names.map(async (name) => {
    const store = tx.objectStore(name);
    const [keys, values] = await Promise.all([store.getAllKeys(), store.getAll()]);
    return [name, keys.map((key, i) => ({ key, value: encode(values[i]) }))];
  }));
  await tx.done;
  return new Blob([JSON.stringify({ format: "diary-encrypted-backup", version: 1, stores: Object.fromEntries(stores) })], { type: "application/json" });
}