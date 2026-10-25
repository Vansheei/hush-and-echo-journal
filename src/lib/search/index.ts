import { decryptJSON, encryptJSON } from "@/lib/crypto/vault";
import { db, type Entry } from "@/lib/storage/db";
const VERSION = "multilingual-minilm-v1";
type VectorRow = { entryId: string; start: number; text: string; vector: number[] };
let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (v: number[][]) => void; reject: (e: Error) => void }>();
function embed(texts: string[]) {
  if (!worker) {
    worker = new Worker(new URL("./embeddings.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = e => { const h = pending.get(e.data.id); if (!h) return; pending.delete(e.data.id); if (e.data.error) h.reject(new Error(e.data.error)); else h.resolve(e.data.vectors); };
    worker.onerror = () => { for (const h of pending.values()) h.reject(new Error("Local search stopped. Please retry.")); pending.clear(); worker?.terminate(); worker = null; };
  }
  const current = worker;
  return new Promise<number[][]>((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); current.postMessage({ id, texts }); });
}
export function cosine(a: number[], b: number[]) {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i] ?? 0, y = b[i] ?? 0; dot += x * y; aa += x * x; bb += y * y; }
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
}
export async function semanticSearch(key: CryptoKey, entries: Entry[], query: string, active: () => boolean, progress: (text: string) => void) {
  const texts = entries.filter(e => e.status === "done").flatMap(e => e.segments.map(s => ({ entryId: e.id, start: s.start, text: s.text })));
  if (!texts.length) return [];
  const signature = JSON.stringify(texts);
  const cached = await (await db()).get("private", "search-index");
  let index = cached ? await decryptJSON<{ version: string; signature: string; rows: VectorRow[] }>(key, cached.data) : null;
  if (!index || index.version !== VERSION || index.signature !== signature) {
    const rows: VectorRow[] = [];
    for (let i = 0; i < texts.length; i += 8) {
      if (!active()) throw new Error("Search stopped.");
      progress(`Preparing local search ${i}/${texts.length}…`);
      const batch = texts.slice(i, i + 8); const vectors = await embed(batch.map(r => r.text));
      batch.forEach((r, j) => rows.push({ ...r, vector: vectors[j] ?? [] }));
    }
    if (!active()) throw new Error("Search stopped.");
    index = { version: VERSION, signature, rows };
    await (await db()).put("private", { id: "search-index", data: await encryptJSON(key, index) });
  }
  progress("Searching on this phone…");
  const [vector] = await embed([query]);
  if (!active()) throw new Error("Search stopped.");
  return index.rows.map(r => ({ ...r, score: cosine(r.vector, vector ?? []) })).sort((a, b) => b.score - a.score).slice(0, 12);
}
export function stopSearch() { worker?.terminate(); worker = null; for (const h of pending.values()) h.reject(new Error("Search stopped.")); pending.clear(); }