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
  const isSameDay =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
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

function millis(date: IsoDate): number {
  const value = utcMidnight(date);
  if (value === undefined)
    throw new RangeError(`Not a date-only ISO string: "${date}"`);
  return value;
}
