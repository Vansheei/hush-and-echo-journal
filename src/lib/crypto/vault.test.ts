// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  changePassphrase,
  createVault,
  decryptJSON,
  encryptJSON,
  resetPassphrase,
  unlockWithPassphrase,
  WrongSecretError,
} from "./vault";

const IT = 1000;

describe("vault", () => {
  it("round-trips data and unlocks with the passphrase", async () => {
    const { meta, key, phrase } = await createVault("correct horse", IT);
    expect(phrase.split(" ")).toHaveLength(12);
    const enc = await encryptJSON(key, { hello: "world" });
    const k2 = await unlockWithPassphrase(meta, "correct horse");
    expect(await decryptJSON(k2, enc)).toEqual({ hello: "world" });
  });

  it("rejects a wrong passphrase", async () => {
    const { meta } = await createVault("right", IT);
    await expect(unlockWithPassphrase(meta, "wrong")).rejects.toBeInstanceOf(WrongSecretError);
  });

  it("recovery phrase resets the passphrase and keeps data readable", async () => {
    const { meta, key, phrase } = await createVault("old", IT);
    const enc = await encryptJSON(key, [1, 2, 3]);
    const { meta: m2 } = await resetPassphrase(meta, `  ${phrase.toUpperCase()} `, "new");
    await expect(unlockWithPassphrase(m2, "old")).rejects.toBeInstanceOf(WrongSecretError);
    expect(await decryptJSON(await unlockWithPassphrase(m2, "new"), enc)).toEqual([1, 2, 3]);
  });

  it("changing passphrase keeps data readable", async () => {
    const { meta, key } = await createVault("a", IT);
    const enc = await encryptJSON(key, "x");
    const m2 = await changePassphrase(meta, "a", "b");
    expect(await decryptJSON(await unlockWithPassphrase(m2, "b"), enc)).toBe("x");
  });
});
