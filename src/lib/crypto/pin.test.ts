import { expect, it } from "vitest";
import { createPinWrap, createVault, encryptJSON, decryptJSON, unlockWithPinWrap, unlockWithPassphrase } from "./vault";

it("PIN unlock opens the existing diary without removing passphrase access", async () => {
  const { meta, key } = await createVault("owner-pass", 1000);
  const data = await encryptJSON(key, "private chapter");
  const wrap = await createPinWrap(meta, "owner-pass", "739284");
  expect(await decryptJSON(await unlockWithPinWrap(wrap, "739284"), data)).toBe("private chapter");
  expect(await decryptJSON(await unlockWithPassphrase(meta, "owner-pass"), data)).toBe("private chapter");
  await expect(unlockWithPinWrap(wrap, "739285")).rejects.toThrow();
});
it("PIN setup rejects malformed PINs and the wrong passphrase", async () => {
  const { meta } = await createVault("owner-pass", 1000);
  await expect(createPinWrap(meta, "owner-pass", "12345")).rejects.toThrow();
  await expect(createPinWrap(meta, "owner-pass", "abcdef")).rejects.toThrow();
  await expect(createPinWrap(meta, "wrong", "739284")).rejects.toThrow();
});