/** Date helpers for synthetic data. Dates are date-only ISO strings in UTC (ARC-005). */
import { parseIsoDate, type IsoDate } from "@church-logistics/core";

const MS_PER_DAY = 86_400_000;

/** The date a whole number of days after (or before, if negative) the given date. */
export function addDays(date: IsoDate, days: number): IsoDate {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const result = new Date(Date.UTC(y, m - 1, d) + days * MS_PER_DAY);
  return parseIsoDate(result.toISOString().slice(0, 10));
}
