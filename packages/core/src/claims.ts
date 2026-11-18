/**
 * Claims nothing in Prepped or SpareWing may make (SYS-309): no text the apps print, whether an
 * AI draft or a rule card, says a part, pilot, medicine or document is approved or fit to fly
 * (owner, 2026-11-16 and 2026-11-17; ADR-039, ADR-040; moved to core so rule cards are checked
 * too, REV-012, ADR-044).
 */

/** The claims, as the prompts name them. */
export const FORBIDDEN_CLAIMS = [
  "approved", // eslint-disable-line no-restricted-syntax -- the list this check refuses (SYS-309)
  "airworthy",
  "flightworthy",
  "safe to fly",
  "cleared",
  "ready to fly",
  "fit to fly",
] as const;

/** The claims, written for a prompt: "approved, airworthy, … ready to fly or fit to fly". */
export const FORBIDDEN_IN_WORDS = `${FORBIDDEN_CLAIMS.slice(0, -1).join(", ")} or ${FORBIDDEN_CLAIMS.slice(-1).join("")}`;

/**
 * Every spelling of each claim, in the order above: any form of the word, and words joined by
 * spaces or hyphens (owner, 2026-11-17; REV-011, ADR-040). "Clear" alone is an everyday word
 * and is not refused; "cleared" and "clearance" are.
 */
const GAP = "[\\s-]*";
const SPACE = "[\\s-]+";
const CLAIM_PATTERNS = [
  "approv\\p{L}*",
  "airworth\\p{L}*",
  `flight${GAP}worth\\p{L}*`,
  `safe${SPACE}to${SPACE}fly`,
  "cleared|clearance",
  `ready${SPACE}to${SPACE}fly`,
  `fit${SPACE}(?:to${SPACE}fly|for${SPACE}flight)`,
].map((p) => new RegExp(`(?<![\\p{L}])(?:${p})(?![\\p{L}])`, "giu"));

/** The forbidden claims in the text, as written in lower case, claim by claim. */
export function forbiddenClaims(text: string): string[] {
  return CLAIM_PATTERNS.flatMap((p) =>
    [...text.matchAll(p)].map((m) => m[0].toLowerCase()),
  );
}
