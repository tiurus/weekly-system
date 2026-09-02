import { describe, expect, it } from "vitest";
import { suggestMode } from "./modes";

describe("suggestMode", () => {
  it.each([
    [1, 3, "MINIMUM"],
    [3, 1, "MINIMUM"],
    [2, 2, "NORMAL"],
    [3, 2, "RESOURCE"],
    [3, 3, "RESOURCE"],
  ] as const)(
    "maps energy %s and sleep %s to %s",
    (energy, sleep, expected) => {
      expect(suggestMode(energy, sleep)).toBe(expected);
    },
  );
});
