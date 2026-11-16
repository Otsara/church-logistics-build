/**
 * Names replaced by ids before any AI call (ARC-013; SYS-006, SEC-005). Matching is whole-word
 * and ignores letter case; the longest name is replaced first, so "Avery Testpilot" is not left
 * as "PIL02 Testpilot" when "Avery" is also known. Blank names never match.
 */

/** A person or organisation known by name, with the id that stands in for it. */
export interface KnownName {
  readonly id: string;
  readonly name: string;
}

const escape = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A whole-word, case-blind pattern for one name. */
const pattern = (name: string): RegExp =>
  new RegExp(`(?<![\\p{L}\\p{N}])${escape(name)}(?![\\p{L}\\p{N}])`, "giu");

/** Replaces every known name in the text by its id. */
export function replaceNames(
  text: string,
  people: readonly KnownName[],
): string {
  const named = people
    .map((p) => ({ id: p.id, name: p.name.trim() }))
    .filter((p) => p.name !== "")
    .sort((a, b) => b.name.length - a.name.length);
  return named.reduce((out, p) => out.replace(pattern(p.name), p.id), text);
}

/** True when any known name is still in the text. */
export function containsName(text: string, names: readonly string[]): boolean {
  return names
    .map((n) => n.trim())
    .some((n) => n !== "" && pattern(n).test(text));
}
