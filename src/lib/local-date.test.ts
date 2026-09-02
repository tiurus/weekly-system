import { describe, expect, it } from "vitest";
import { getLocalDateString, getWeekRange } from "./local-date";

describe("local dates", () => {
  it("uses the configured timezone near a UTC day boundary", () => {
    const now = new Date("2026-09-01T22:30:00.000Z");
    expect(getLocalDateString("Europe/Moscow", now)).toBe("2026-09-02");
    expect(getLocalDateString("America/New_York", now)).toBe("2026-09-01");
  });

  it("builds a Monday to Sunday week", () => {
    const range = getWeekRange("2026-09-02");
    expect(range.startsOn.toISOString().slice(0, 10)).toBe("2026-08-31");
    expect(range.endsOn.toISOString().slice(0, 10)).toBe("2026-09-06");
  });
});
