/**
 * Date-only ISO strings (YYYY-MM-DD), compared in UTC (ARC-005).
 *
 * Rule functions take dates as input and never read the clock, so a changed arrival date
 * recalculates without any other dependency (TC-108).
 */

declare const isoDateBrand: unique symbol;

/** A validated calendar date written as YYYY-MM-DD. */
export type IsoDate = string & { readonly [isoDateBrand]: true };

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** Milliseconds since the epoch at 00:00 UTC on the given date, or undefined if it is not a real date. */
function utcMidnight(value: string): number | undefined {
  const match = ISO_DATE_PATTERN.exec(value);
  if (match === null) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0); // eslint-disable-line no-restricted-syntax -- the one place a Date is built (ARC-005)
  date.setUTCFullYear(year, month - 1, day);
  // An impossible date rolls over to a different month or day. If month and day both survive,
  // the year cannot have changed, so checking it as well would be redundant.
  const isSameDay =
    date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isSameDay ? date.getTime() : undefined;
}

/** True if the value is a real calendar date written as YYYY-MM-DD. */
export function isIsoDate(value: string): value is IsoDate {
  return utcMidnight(value) !== undefined;
}

/** Returns the value as an IsoDate, or throws a RangeError naming the bad value. */
export function parseIsoDate(value: string): IsoDate {
  if (!isIsoDate(value)) {
    throw new RangeError(`Not a date-only ISO string (YYYY-MM-DD): "${value}"`);
  }
  return value;
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((millis(to) - millis(from)) / MS_PER_DAY);
}

/**
 * The last day of a month, for an expiry printed as month and year only (OD-043: read as the
 * last day of that month). Throws a RangeError for a month or year that is not a calendar value.
 */
export function lastDayOfMonth(year: number, month: number): IsoDate {
  const date = new Date(0); // eslint-disable-line no-restricted-syntax -- dates are built only here (ARC-005)
  // Day 0 of the next month is the last day of this one.
  date.setUTCFullYear(year, month, 0);
  const pad = (n: number, width: number): string =>
    String(n).padStart(width, "0");
  const text = `${pad(year, 4)}-${pad(month, 2)}-${pad(date.getUTCDate(), 2)}`;
  // A month or year that is not a calendar value (0, 13, 2.5, -1, 10000) never makes a real
  // date written with that same year and month, so this one check rejects them all.
  if (!isIsoDate(text)) {
    throw new RangeError(
      `Not a calendar month: year ${String(year)}, month ${String(month)}`,
    );
  }
  return text;
}

export const WEEKDAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** The date a whole number of days later (or earlier, if negative), in UTC. */
export function addDays(date: IsoDate, days: number): IsoDate {
  if (!Number.isInteger(days)) {
    throw new RangeError(`Not a whole number of days: ${String(days)}`);
  }
  const moved = new Date(millis(date) + days * MS_PER_DAY); // eslint-disable-line no-restricted-syntax -- dates are built only here (ARC-005)
  return parseIsoDate(moved.toISOString().slice(0, 10));
}

/** The day of the week of a date, in UTC. */
export function weekday(date: IsoDate): Weekday {
  // 1970-01-01 was a Thursday, index 3 from Monday.
  const days = Math.round(millis(date) / MS_PER_DAY);
  return WEEKDAYS[(((days + 3) % 7) + 7) % 7] as Weekday;
}

function millis(date: IsoDate): number {
  const value = utcMidnight(date);
  if (value === undefined)
    throw new RangeError(`Not a date-only ISO string: "${date}"`);
  return value;
}
