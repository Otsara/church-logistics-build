/**
 * Reading an expiry date as entered on a donor line (ARC-101; safety-critical). A full date is
 * YYYY-MM-DD; a date printed as month and year only, MM/YYYY, is read as the last day of that
 * month (OD-043). Anything else is never guessed: it is reported so the lot needs review (SYS-105).
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

const MONTH_YEAR = /^(\d{1,2})\/(\d{4})$/;

/** Reads an expiry as entered. Never throws. */
export function readExpiry(entered: string | null): ExpiryReading {
  const text = entered?.trim() ?? "";
  if (text === "") return { ok: false, reason: NO_EXPIRY_REASON };
  if (isIsoDate(text)) {
    return { ok: true, expiry: { date: text, monthOnly: false, text } };
  }
  const match = MONTH_YEAR.exec(text);
  const month = Number(match?.[1]);
  if (match !== null && month >= 1 && month <= 12) {
    const date = lastDayOfMonth(Number(match[2]), month);
    return { ok: true, expiry: { date, monthOnly: true, text } };
  }
  return {
    ok: false,
    reason: `expiry date not readable: "${text}": check the lot`,
  };
}
