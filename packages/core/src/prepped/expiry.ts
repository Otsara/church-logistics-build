/**
 * Reading an expiry date as entered from a label (ARC-101; safety-critical). Every label format
 * whose meaning is unambiguous is read (owner, 2026-11-13; TC-133); a date printed as month and
 * year only is read as the last day of that month (OD-043). A two-digit year written last means
 * 20YY, even after a numeric day and month, where a year-first label (YY-MM-DD) would be misread;
 * the owner accepted that risk, and the reading is always shown (owner, 2026-11-13; HAZ-101).
 * Nothing is guessed: a day and month that could be read either way, or anything else, is
 * reported, so the lot needs review (SYS-105).
 */
import { isIsoDate, lastDayOfMonth, type IsoDate } from "../dates.ts";

export interface Expiry {
  readonly date: IsoDate;
  readonly monthOnly: boolean;
  /** The text as entered, trimmed, so the reading can be shown beside it. */
  readonly text: string;
}

export type ExpiryReading =
  | { readonly ok: true; readonly expiry: Expiry }
  | { readonly ok: false; readonly reason: string };

export const NO_EXPIRY_REASON = "no expiry date recorded: check the lot";

/** English month names and abbreviations (labels in English only, OD-030). */
const MONTHS = new Map<string, number>([
  ["JAN", 1],
  ["JANUARY", 1],
  ["FEB", 2],
  ["FEBRUARY", 2],
  ["MAR", 3],
  ["MARCH", 3],
  ["APR", 4],
  ["APRIL", 4],
  ["MAY", 5],
  ["JUN", 6],
  ["JUNE", 6],
  ["JUL", 7],
  ["JULY", 7],
  ["AUG", 8],
  ["AUGUST", 8],
  ["SEP", 9],
  ["SEPT", 9],
  ["SEPTEMBER", 9],
  ["OCT", 10],
  ["OCTOBER", 10],
  ["NOV", 11],
  ["NOVEMBER", 11],
  ["DEC", 12],
  ["DECEMBER", 12],
]);

/** A leading label word, such as "EXP", "Exp.:", "Expiry date", "Expires" or "Use by". */
const LABEL = /^(?:EXP(?:IRY|IRES)?\.?(?: DATE)?|USE BY) ?:? ?/;

// Days and months have 1–2 digits; separators are "-", "/" or ".". A year has 4 digits, or 2
// where it is certainly last (YEAR = 4 or 2 digits).
const YEAR_MONTH_DAY = /^(\d{4})([-/.])(\d{1,2})\2(\d{1,2})$/;
const YEAR_MONTH = /^(\d{4})[-/.](\d{1,2})$/;
const MONTH_YEAR = /^(\d{1,2})[-/.](\d{4}|\d{2})$/;
const NUMERIC_DAY_MONTH_YEAR = /^(\d{1,2})([-/.])(\d{1,2})\2(\d{4}|\d{2})$/;
// A named month may be separated by a space, "-", "/", "." or nothing ("15MAR2028").
const DAY_NAME_YEAR = /^(\d{1,2})[ \-/.]?([A-Z]+)[ \-/.]?(\d{4}|\d{2})$/;
const NAME_DAY_YEAR = /^([A-Z]+)[ \-/.]?(\d{1,2}),?[ \-/.]?(\d{4}|\d{2})$/;
const NAME_YEAR = /^([A-Z]+)[ \-/.]?(\d{4}|\d{2})$/;

const pad = (n: string): string => n.padStart(2, "0");

/** A two-digit year written last means 20YY (owner, 2026-11-13). */
const fullYear = (year: string): string =>
  year.length === 2 ? `20${year}` : year;

/** A capture group; every group used here always takes part in its match. */
const g = (m: RegExpExecArray, i: number): string => String(m[i]);

/** The date, if year, month and day make a real one. */
const fullDate = (year: string, month: number, day: string): IsoDate | null => {
  const text = `${fullYear(year)}-${pad(String(month))}-${pad(day)}`;
  return isIsoDate(text) ? text : null;
};

type Read =
  | { readonly date: IsoDate; readonly monthOnly: boolean }
  | { readonly unclear: true }
  | null;

/** Reads a normalised label text (upper case, single spaces, label word removed). */
function readLabel(s: string): Read {
  let m = YEAR_MONTH_DAY.exec(s);
  if (m !== null) return full(fullDate(g(m, 1), Number(g(m, 3)), g(m, 4)));
  m = NUMERIC_DAY_MONTH_YEAR.exec(s);
  if (m !== null) {
    const [a, b, year] = [g(m, 1), g(m, 3), g(m, 4)];
    const dayFirst = fullDate(year, Number(b), a);
    const monthFirst = fullDate(year, Number(a), b);
    // Read only when one order is impossible, or both give the same date (05/05).
    if (dayFirst !== null && monthFirst !== null && dayFirst !== monthFirst)
      return { unclear: true };
    return full(dayFirst ?? monthFirst);
  }
  m = DAY_NAME_YEAR.exec(s);
  if (m !== null) return full(named(g(m, 3), g(m, 2), g(m, 1)));
  // Month and year before month, day and year, so "MAR 2028" is never read as "MAR 20, 28".
  m = NAME_YEAR.exec(s);
  if (m !== null) return monthEnd(g(m, 2), MONTHS.get(g(m, 1)) ?? 0);
  m = NAME_DAY_YEAR.exec(s);
  if (m !== null) return full(named(g(m, 3), g(m, 1), g(m, 2)));
  m = YEAR_MONTH.exec(s);
  if (m !== null) return monthEnd(g(m, 1), Number(g(m, 2)));
  m = MONTH_YEAR.exec(s);
  if (m !== null) return monthEnd(g(m, 2), Number(g(m, 1)));
  return null;
}

const full = (date: IsoDate | null): Read =>
  date === null ? null : { date, monthOnly: false };

const named = (year: string, name: string, day: string): IsoDate | null => {
  const month = MONTHS.get(name);
  return month === undefined ? null : fullDate(year, month, day);
};

const monthEnd = (year: string, month: number): Read =>
  month >= 1 && month <= 12
    ? { date: lastDayOfMonth(Number(fullYear(year)), month), monthOnly: true }
    : null;

/** Reads an expiry as entered. Never throws. */
export function readExpiry(entered: string | null): ExpiryReading {
  const text = entered?.trim() ?? "";
  if (text === "") return { ok: false, reason: NO_EXPIRY_REASON };
  const normalised = text.toUpperCase().replace(/\s+/g, " ").replace(LABEL, "");
  const read = readLabel(normalised);
  if (read !== null && "date" in read) {
    return { ok: true, expiry: { ...read, text } };
  }
  const problem =
    read === null
      ? "expiry date not readable:"
      : "day and month order unclear in";
  return { ok: false, reason: `${problem} "${text}": check the lot` };
}
