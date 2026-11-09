import { describe, expect, it } from "vitest";
import {
  daysBetween,
  isIsoDate,
  parseIsoDate,
  type IsoDate,
} from "../src/dates.ts";

const d = parseIsoDate;

describe("date-only ISO strings", () => {
  it("[F-5] accepts real calendar dates written as YYYY-MM-DD", () => {
    expect(isIsoDate("2026-12-01")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("0099-01-01")).toBe(true);
  });

  it("[F-5] rejects impossible dates, other formats and date-times", () => {
    for (const value of [
      "2026-02-30",
      "2027-02-29",
      "2026-13-01",
      "2026-00-10",
      "2026-1-01",
      "01/12/2026",
      "2026-12-01T00:00:00Z",
      "",
    ]) {
      expect(isIsoDate(value), value).toBe(false);
    }
  });

  it("[F-5] parseIsoDate returns the same string or throws a RangeError naming the value", () => {
    expect(parseIsoDate("2027-03-01")).toBe("2027-03-01");
    expect(() => parseIsoDate("2027-02-30")).toThrow(RangeError);
    expect(() => parseIsoDate("2027-02-30")).toThrow('"2027-02-30"');
  });
});

describe("daysBetween", () => {
  it("[F-5] counts whole days in UTC, matching the worked numbers in P-1 and P-2", () => {
    expect(daysBetween(d("2026-12-01"), d("2027-03-01"))).toBe(90);
    expect(daysBetween(d("2026-12-01"), d("2028-01-15"))).toBe(410);
  });

  it("[F-5] is negative when the second date is earlier, and zero for the same date", () => {
    expect(daysBetween(d("2027-03-01"), d("2026-12-01"))).toBe(-90);
    expect(daysBetween(d("2026-12-01"), d("2026-12-01"))).toBe(0);
  });

  it("[F-5] counts leap days and is not affected by daylight saving changes", () => {
    expect(daysBetween(d("2028-02-28"), d("2028-03-01"))).toBe(2);
    expect(daysBetween(d("2026-03-07"), d("2026-03-09"))).toBe(2);
    expect(daysBetween(d("2026-10-31"), d("2026-11-02"))).toBe(2);
  });

  it("[F-5] throws if handed a string that bypassed validation", () => {
    expect(() => daysBetween("2026-02-30" as IsoDate, d("2026-12-01"))).toThrow(
      RangeError,
    );
  });
});
