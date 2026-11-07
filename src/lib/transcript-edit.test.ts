import { expect, it } from "vitest";
import { applySegmentEdits } from "./transcript-edit";

const segs = [
  { start: 0, end: 4, text: "I went too the park" },
  { start: 4, end: 9, text: "with Mira" },
];

it("keeps each piece's times when its words are corrected", () => {
  expect(applySegmentEdits(segs, ["I went to the park", "with Meera"])).toEqual([
    { start: 0, end: 4, text: "I went to the park" },
    { start: 4, end: 9, text: "with Meera" },
  ]);
});

it("drops a piece the owner emptied", () => {
  expect(applySegmentEdits(segs, ["  ", "with Mira"])).toEqual([{ start: 4, end: 9, text: "with Mira" }]);
});

it("refuses to save when the transcript changed underneath", () => {
  expect(() => applySegmentEdits(segs, ["only one"])).toThrow();
});
