import "fake-indexeddb/auto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { createVault, decryptJSON, encryptionOnlyKey, unlockWithPassphrase } from "@/lib/crypto/vault";
import { completeEntry, db, DEFAULT_SETTINGS, deleteEntry, getApiKey, getEntry, listItems, putApiKey, putEntry, putItem, putSettings, putVaultMeta, type Entry } from "./db";
import { decodeBackupValue, exportBackup } from "./backup";
import { requestPersistence } from "./persistence";
beforeAll(() => { Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true }); });
describe("Phase 1 safeguards", () => {
  it("requests browser persistence and reports refusal", async () => {
    const persist = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    Object.defineProperty(navigator, "storage", { configurable: true, value: { persist } });
    expect(await requestPersistence()).toBe(true); expect(await requestPersistence()).toBe(false); expect(persist).toHaveBeenCalledTimes(2);
  });
  it("encrypt-only completion cannot decrypt and saves after releasing the decrypt key", async () => {
    let key: CryptoKey | null = (await createVault("passphrase", 1000)).key;
    const writer = encryptionOnlyKey(key);
    const entry: Entry = { id: "completion", createdAt: 1, kind: "audio", mimeType: "audio/webm", durationSec: 30, size: 1, chunkCount: 1, status: "transcribing", segments: [] };
    const revision = await putEntry(key, entry);
    const reader = key; key = null;
    expect(key).toBeNull(); expect(writer.usages).toEqual(["encrypt"]); expect(writer.extractable).toBe(false);
    await completeEntry(writer, { ...entry, status: "done", segments: [{ start: 0, end: 30, text: "Finished safely" }] }, revision);
    const row = await (await db()).get("entries", entry.id);
    await expect(decryptJSON(writer, row.data)).rejects.toThrow();
    expect((await getEntry(reader, entry.id))?.segments[0]?.text).toBe("Finished safely");
    await deleteEntry(entry.id);
    await completeEntry(writer, entry, revision);
    expect(await getEntry(reader, entry.id)).toBeUndefined();
  });
  it("exports recoverable ciphertext including settings, key and Phase 2 items", async () => {
    const { key, meta } = await createVault("backup-pass", 1000);
    await putVaultMeta(meta); await putSettings(key, DEFAULT_SETTINGS); await putApiKey(key, "private-test-key");
    await putItem(key, { id: "item", kind: "worry", text: "private parked worry", closed: false, createdAt: 1 });
    expect((await listItems(key))[0]?.text).toBe("private parked worry");
    expect(await getApiKey(key)).toBe("private-test-key");
    const blob = await exportBackup();
    const text = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsText(blob); });
    expect(text).not.toContain("private parked worry"); expect(text).not.toContain("private-test-key");
    const backup = JSON.parse(text); expect(backup.version).toBe(1);
    const vaultRow = backup.stores.meta.find((r: { key: string }) => r.key === "vault");
    const restoredKey = await unlockWithPassphrase(decodeBackupValue(vaultRow.value) as typeof meta, "backup-pass");
    const item = decodeBackupValue(backup.stores.items[0].value) as { data: Parameters<typeof decryptJSON>[1] };
    expect(await decryptJSON(restoredKey, item.data)).toMatchObject({ text: "private parked worry" });
  });
});