import { describe, it, expect } from "vitest";
import { convertToICSDatetime } from "./resend";

describe("convertToICSDatetime", () => {
  it("converts a Date to [year, month, day, hour, minute]", () => {
    // months are 0-indexed in JS Date, so 0 = January
    const date = new Date(2024, 0, 15, 14, 30);
    expect(convertToICSDatetime(date)).toEqual([2024, 1, 15, 14, 30]);
  });

  it("handles December correctly (month 12)", () => {
    const date = new Date(2024, 11, 25, 9, 0);
    expect(convertToICSDatetime(date)).toEqual([2024, 12, 25, 9, 0]);
  });

  it("handles midnight", () => {
    const date = new Date(2025, 5, 1, 0, 0);
    expect(convertToICSDatetime(date)).toEqual([2025, 6, 1, 0, 0]);
  });
});
