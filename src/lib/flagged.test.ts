import { expect, it } from "vitest";
import { cleanToken, flaggedSet, isFlagged } from "./flagged";

it("matches flagged words case- and punctuation-insensitively", () => {
  const flagged = ["Koot", "dungi!"];
  expect(isFlagged(flagged, "koot")).toBe(true);
  expect(isFlagged(flagged, "Dungi")).toBe(true);
  expect(isFlagged(flagged, "hello")).toBe(false);
  expect(isFlagged(undefined, "koot")).toBe(false);
  expect(isFlagged(flagged, "…")).toBe(false);
});

it("cleans tokens and builds lowercase sets", () => {
  expect(cleanToken("  Hören! ")).toBe("hören");
  expect(flaggedSet(["Mama"]).has("mama")).toBe(true);
});
