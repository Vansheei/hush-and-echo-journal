import { expect, it } from "vitest";
import { translate, LANGUAGES } from ".";
import { createVault } from "@/lib/crypto/vault";
import { saveWritten, getEntry } from "@/lib/storage/db";
import { setAppearance } from "@/lib/appearance";
import "fake-indexeddb/auto";

it("offers exactly English, Hindi and German interface languages", () => {
  expect(LANGUAGES.map(l => l.value)).toEqual(["en", "hi", "de"]);
});
it("keeps interpolated personal words unchanged", () => {
  const phrase = "Spill the tea";
  expect(translate("Meaning of {phrase}", "hi", { phrase })).toContain(phrase);
  expect(translate("Meaning of {phrase}", "de", { phrase })).toContain(phrase);
});
it("changing interface language never translates a saved diary entry", async () => {
  const { key } = await createVault("local-test-pass", 1000);
  const text = "Today मैंने लिखा: Guten Abend.";
  const entry = await saveWritten(key, text);
  setAppearance({ language: "de" });
  expect((await getEntry(key, entry.id))?.segments.map(s => s.text).join(" ")).toBe(text);
  setAppearance({ language: "hi" });
  expect((await getEntry(key, entry.id))?.segments.map(s => s.text).join(" ")).toBe(text);
});