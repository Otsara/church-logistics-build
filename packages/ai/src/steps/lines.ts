/**
 * Checking an AI reader's answer against the lines it was given (ARC-008; owner, 2026-11-16;
 * ADR-035). The AI copies text; the code checks every copy is written in the line, ignoring only
 * letter case and extra spaces, and empties any value that is not. Each answer must name a line
 * that exists and copy it exactly; a line is answered at most once. Never throws.
 */

const normal = (text: string): string =>
  text.replace(/\s+/g, " ").trim().toLowerCase();

/** True when the value is written in the line, ignoring letter case and extra spaces. */
export function writtenIn(line: string, value: string): boolean {
  const wanted = normal(value);
  return wanted !== "" && normal(line).includes(wanted);
}

/** True when the number appears in the line as a whole number, not part of another. */
export function numberIn(line: string, value: number): boolean {
  return new RegExp(`(?<![\\d.])${String(value)}(?!\\d|\\.\\d)`).test(line);
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

/** Keeps a copied text value only if it is written in the line; otherwise records why not. */
export function keepText(
  line: string,
  label: string,
  value: string | null,
  reasons: string[],
): string | null {
  if (value === null) return null;
  if (writtenIn(line, value)) return value;
  reasons.push(`${label} "${value}" is not written in the line: left empty`);
  return null;
}

/** Keeps a quantity only if it is written in the line as a whole number. */
export function keepNumber(
  line: string,
  value: number | null,
  reasons: string[],
): number | null {
  if (value === null) return null;
  if (numberIn(line, value)) return value;
  reasons.push(
    `quantity "${String(value)}" is not written in the line: left empty`,
  );
  return null;
}
