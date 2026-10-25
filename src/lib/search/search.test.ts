import { expect, it } from "vitest";
import { cosine } from "./index";
it("ranks a matching multilingual embedding above an orthogonal one", () => {
  expect(cosine([1, 0], [1, 0])).toBe(1); expect(cosine([1, 0], [0, 1])).toBe(0);
});