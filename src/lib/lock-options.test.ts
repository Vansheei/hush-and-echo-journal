import { expect, it } from "vitest";
import { passphraseHidden } from "./lock-options";
it("hides the passphrase only with fingerprint or PIN set up", () => {
  expect(passphraseHidden(true, true, false)).toBe(true);
  expect(passphraseHidden(true, false, true)).toBe(true);
  expect(passphraseHidden(true, false, false)).toBe(false);
  expect(passphraseHidden(false, true, true)).toBe(false);
});
