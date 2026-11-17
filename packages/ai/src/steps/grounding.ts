/**
 * Grounding AI text in computed facts (SYS-003; TC-010, TC-310). Every id-like code (letters
 * with digits, such as F1, PIL01, SW-A01, SWP-1155-6), every date and every number in the text
 * must appear among the given values, so the AI cannot add an item, a figure or a date of its
 * own (owner, 2026-11-16; ADR-039). Never throws.
 */

export type Value = string | number | null;

const ID =
  /(?<![\p{L}\p{N}-])\p{L}[\p{L}\p{N}]*(?:-[\p{L}\p{N}]+)*(?![\p{L}\p{N}])/gu;
const DATE = /\d{4}-\d{2}-\d{2}/g;
const NUMBER = /\d+(?:\.\d+)?/g;

const escape = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** True when the token is written as a whole word in one of the values, ignoring letter case. */
function allowed(token: string, values: readonly Value[]): boolean {
  const word = new RegExp(
    `(?<![\\p{L}\\p{N}.])${escape(token)}(?![\\p{L}\\p{N}]|\\.\\d)`,
    "iu",
  );
  return values.some((v) => word.test(String(v)));
}

/**
 * The codes, dates and numbers in the text that are not among the values, in that order. Each
 * kind is taken out of the text once read, so the digits of a code or date are not read again
 * as numbers. Words without digits are not codes and are not checked here.
 */
export function ungrounded(text: string, values: readonly Value[]): string[] {
  const missing: string[] = [];
  let rest = text;
  for (const pattern of [ID, DATE, NUMBER]) {
    for (const token of rest.match(pattern) ?? []) {
      if (/\d/.test(token) && !allowed(token, values)) missing.push(token);
    }
    rest = rest.replace(pattern, " ");
  }
  return missing;
}
