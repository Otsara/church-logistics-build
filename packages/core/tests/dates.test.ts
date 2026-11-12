import { describe, expect, it } from "vitest";
import {
  daysBetween,
  isIsoDate,
  lastDayOfMonth,
  parseIsoDate,
  type IsoDate,
} from "../src/dates.ts";

const d = parseIsoDate;

describe("date-only ISO strings", () => {
  it("[ARC-005] accepts real calendar dates written as YYYY-MM-DD", () => {
    expect(isIsoDate("2026-12-01")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("0099-01-01")).toBe(true);
  });

  it("[ARC-005] rejects impossible dates, other formats and date-times", () => {
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

  it("[ARC-005] parseIsoDate returns the same string or throws a RangeError naming the value", () => {
    expect(parseIsoDate("2027-03-01")).toBe("2027-03-01");
    expect(() => parseIsoDate("2027-02-30")).toThrow(RangeError);
    expect(() => parseIsoDate("2027-02-30")).toThrow('"2027-02-30"');
  });
});

describe("daysBetween", () => {
  it("[ARC-005] counts whole days in UTC, matching the worked numbers in TC-101 and TC-102", () => {
    expect(daysBetween(d("2026-12-01"), d("2027-03-01"))).toBe(90);
    expect(daysBetween(d("2026-12-01"), d("2028-01-15"))).toBe(410);
  });

  it("[ARC-005] is negative when the second date is earlier, and zero for the same date", () => {
    expect(daysBetween(d("2027-03-01"), d("2026-12-01"))).toBe(-90);
    expect(daysBetween(d("2026-12-01"), d("2026-12-01"))).toBe(0);
  });

  it("[ARC-005] counts leap days and is not affected by daylight saving changes", () => {
    expect(daysBetween(d("2028-02-28"), d("2028-03-01"))).toBe(2);
    expect(daysBetween(d("2026-03-07"), d("2026-03-09"))).toBe(2);
    expect(daysBetween(d("2026-10-31"), d("2026-11-02"))).toBe(2);
  });

  it("[ARC-005] throws if handed a string that bypassed validation", () => {
    expect(() => daysBetween("2026-02-30" as IsoDate, d("2026-12-01"))).toThrow(
      RangeError,
    );
  });
});

describe("date validation edges", () => {
  it("[ARC-005] rejects text before or after the date, and names the bad value when misused", () => {
    expect(isIsoDate("x2026-12-01")).toBe(false);
    expect(isIsoDate("2026-12-01x")).toBe(false);
    expect(isIsoDate("2026-13-15")).toBe(false);
    expect(isIsoDate("2026-04-31")).toBe(false);
    expect(isIsoDate("2026-00-15")).toBe(false);
    expect(isIsoDate("2026-12-00")).toBe(false);
    expect(() => daysBetween("2026-02-30" as IsoDate, d("2026-12-01"))).toThrow(
      'Not a date-only ISO string: "2026-02-30"',
    );
  });
});

describe("lastDayOfMonth", () => {
  it("[SYS-102] gives the last day of a month, for expiry dates printed as month and year only (OD-043)", () => {
    expect(lastDayOfMonth(2028, 3)).toBe("2028-03-31");
    expect(lastDayOfMonth(2027, 4)).toBe("2027-04-30");
    expect(lastDayOfMonth(2028, 2)).toBe("2028-02-29");
    expect(lastDayOfMonth(2027, 2)).toBe("2027-02-28");
    expect(lastDayOfMonth(2100, 2)).toBe("2100-02-28");
    expect(lastDayOfMonth(2000, 2)).toBe("2000-02-29");
    expect(lastDayOfMonth(2027, 1)).toBe("2027-01-31");
    expect(lastDayOfMonth(2027, 12)).toBe("2027-12-31");
    expect(lastDayOfMonth(999, 6)).toBe("0999-06-30");
  });

  it("[SYS-102] throws a RangeError for a month or year that is not a calendar value", () => {
    for (const [year, month] of [
      [2028, 0],
      [2028, 13],
      [2028, 2.5],
      [-1, 3],
      [10000, 3],
      [2028.5, 3],
    ] as const) {
      expect(
        () => lastDayOfMonth(year, month),
        `${String(year)}/${String(month)}`,
      ).toThrow(RangeError);
    }
    expect(() => lastDayOfMonth(2028, 13)).toThrow("year 2028, month 13");
  });
});
