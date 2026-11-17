/**
 * Wording rules for every AI explanation and message (owner, 2026-11-17; ADR-040, ADR-041): numbers
 * in digits, dates as given, no named people and no promises. Each rule catches what the figures
 * check cannot read. Never throws.
 */
import { wordsIn } from "./grounding.ts";

/** Numbers written in words, which the figures check cannot read. */
const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
  "hundred",
  "thousand",
  "million",
  "dozen",
  "half",
  "quarter",
  "twice",
  "double",
  "triple",
];

/** Words for a date that code cannot check against the dates given (owner, 2026-11-17; ADR-040). */
const RELATIVE_DATES = [
  "today",
  "tonight",
  "tomorrow",
  "yesterday",
  "soon",
  "shortly",
  "(?:next|this|last)\\s+(?:week|weekend|month|year)",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

/** Words that promise a date that is only expected (SYS-309; owner, 2026-11-17; ADR-040). */
const PROMISES = [
  "confirmed",
  "guarantee\\p{L}*",
  "definitely",
  "promis\\p{L}*",
];

/**
 * A title followed by a capitalised name: the AI never gets names (ARC-013), so a named person
 * is invented (owner, 2026-11-17; ADR-040).
 */
const TITLED_NAME =
  /(?<![\p{L}])(?:Pastor|Reverend|Rev|Father|Fr|Brother|Br|Sister|Sr|Mrs|Mr|Ms|Miss|Doctor|Dr|Captain|Capt|Elder|Deacon|Bishop)\.?\s+\p{Lu}\p{L}*/gu;

/** The rules, written for a prompt. */
export const WORDING_RULES =
  'Write numbers in digits. Write dates exactly as given (YYYY-MM-DD), never as today, tomorrow, a weekday or "next week". Describe each date as expected or estimated, never confirmed or promised. Refer to people only by the ids given, never by a name or title.';

/** What breaks the wording rules, as the end of a sentence ("writes \"two\" in words: …"). */
export function wordingProblems(text: string): string[] {
  return [
    ...wordsIn(text, NUMBER_WORDS).map(
      (word) => `writes "${word}" in words: numbers are written in digits`,
    ),
    ...wordsIn(text, RELATIVE_DATES).map(
      (word) => `says "${word}": use the dates given`,
    ),
    ...[...text.matchAll(TITLED_NAME)].map(
      ([name]) =>
        `names a person ("${name}"): refer to people only by the ids given`,
    ),
    ...wordsIn(text, PROMISES).map(
      (word) => `says "${word}": dates are expected, not promised`,
    ),
  ];
}
