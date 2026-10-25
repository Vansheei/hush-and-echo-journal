import { describe, expect, it } from "vitest";
import { createDeviceWrap, createVault, decryptJSON, encryptJSON, encryptionOnlyKey, unlockWithDeviceWrap, unlockWithPassphrase } from "./vault";

describe("device encryption", () => {
  it("device unlock reads existing diary data and retains passphrase fallback", async () => {
    const { meta, key } = await createVault("owner-pass", 1000);
    const data = await encryptJSON(key, { chapter: "private" });
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const wrap = await createDeviceWrap(meta, "owner-pass", secret, new Uint8Array([1]), new Uint8Array(32));
    const deviceKey = await unlockWithDeviceWrap(wrap, secret);
    expect(await decryptJSON(deviceKey, data)).toEqual({ chapter: "private" });
    expect(deviceKey.extractable).toBe(false);
    expect(encryptionOnlyKey(deviceKey).usages).toEqual(["encrypt"]);
    expect(await decryptJSON(await unlockWithPassphrase(meta, "owner-pass"), data)).toEqual({ chapter: "private" });
  });
  it("a different device secret cannot unlock the diary", async () => {
    const { meta } = await createVault("owner-pass", 1000);
    const wrap = await createDeviceWrap(meta, "owner-pass", new Uint8Array(32).fill(1), new Uint8Array([1]), new Uint8Array(32));
    await expect(unlockWithDeviceWrap(wrap, new Uint8Array(32).fill(2))).rejects.toThrow();
  });
  it("setup rejects an incorrect owner passphrase", async () => {
    const { meta } = await createVault("owner-pass", 1000);
    await expect(createDeviceWrap(meta, "wrong", new Uint8Array(32), new Uint8Array([1]), new Uint8Array(32))).rejects.toThrow();
  });
});