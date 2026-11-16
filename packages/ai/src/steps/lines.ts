/**
 * Checking an AI reader's answer against the lines it was given (ARC-008; owner, 2026-11-16;
 * ADR-035). The AI copies text; the code checks every copy is written in the line as whole words,
 * ignoring only letter case and spacing, keeps the line's own text, and empties any value that is
 * not (owner, 2026-11-16; ADR-036). Each answer must name a line
 * that exists and copy it exactly; a line is answered at most once. Never throws.
 */

const normal = (text: string): string =>
  text.replace(/\s+/g, " ").trim().toLowerCase();

const escape = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Finds a copy in the line as whole words, ignoring letter case and spacing, and returns the
 * line's own text for it; null when it is not there or is only part of a word or number
 * (owner, 2026-11-16; ADR-036).
 */
export function findIn(line: string, value: string): string | null {
  const words = value.split(/\s+/).filter((w) => w !== "");
  if (words.length === 0) return null;
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])${words.map(escape).join("\\s+")}(?![\\p{L}\\p{N}])`,
    "iu",
  );
  return pattern.exec(line)?.[0] ?? null;
}

/** True when the number appears in the line as a whole number, not part of another. */
export function numberIn(line: string, value: number): boolean {
  return new RegExp(`(?<![\\d.])${String(value)}(?!\\d|\\.\\d)`).test(line);
}

/** Units that mark a number as a strength, not a count (ADR-036). */
const STRENGTH_UNIT =
  "(?:(?:mg|mcg|µg|ug|g|kg|ml|l|iu|meq|mmol)(?!\\p{L})|%|\\[hp_\\w*\\])";

/** The strength text a quantity is also written as, or null. */
function asStrength(line: string, value: number): string | null {
  const pattern = new RegExp(
    `(?<![\\d.])${String(value)}\\s*${STRENGTH_UNIT}`,
    "iu",
  );
  return pattern.exec(line)?.[0] ?? null;
}

export interface Answered {
  readonly line: number;
  readonly source_line: string;
}

export interface Matched<T> {
  readonly accepted: readonly T[];
  readonly unread: readonly { line: number; sourceLine: string }[];
  readonly problems: readonly string[];
}

/** Keeps each answer that names a real line and copies it exactly; lists unread lines. */
export function matchLines<T extends Answered>(
  lines: readonly string[],
  answers: readonly T[],
): Matched<T> {
  const accepted: T[] = [];
  const problems: string[] = [];
  const seen = new Set<number>();
  for (const answer of answers) {
    const text = lines[answer.line - 1];
    if (text === undefined) {
      problems.push(
        `the AI answered for line ${String(answer.line)}, which is not in the list: set aside`,
      );
    } else if (normal(answer.source_line) !== normal(text)) {
      problems.push(
        `the AI's copy of line ${String(answer.line)} does not match the line: set aside`,
      );
    } else if (seen.has(answer.line)) {
      problems.push(
        `the AI answered line ${String(answer.line)} twice: the second answer set aside`,
      );
    } else {
      seen.add(answer.line);
      accepted.push(answer);
    }
  }
  const unread = lines.flatMap((sourceLine, i) =>
    seen.has(i + 1) ? [] : [{ line: i + 1, sourceLine }],
  );
  return { accepted, unread, problems };
}

/** Keeps a copied text value, as printed in the line, only if it is written there as whole words. */
export function keepText(
  line: string,
  label: string,
  value: string | null,
  reasons: string[],
): string | null {
  if (value === null) return null;
  const found = findIn(line, value);
  if (found === null) {
    reasons.push(`${label} "${value}" is not written in the line: left empty`);
  }
  return found;
}

/**
 * Keeps a quantity only if it is written in the line as a whole number. One also written as a
 * strength (for example "500 mg") is kept but sent to review (owner, 2026-11-16; ADR-036).
 */
export function keepNumber(
  line: string,
  value: number | null,
  reasons: string[],
): number | null {
  if (value === null) return null;
  if (!numberIn(line, value)) {
    reasons.push(
      `quantity "${String(value)}" is not written in the line: left empty`,
    );
    return null;
  }
  const strength = asStrength(line, value);
  if (strength !== null) {
    reasons.push(
      `quantity "${String(value)}" is also written as a strength ("${strength}"): check`,
    );
  }
  return value;
}
