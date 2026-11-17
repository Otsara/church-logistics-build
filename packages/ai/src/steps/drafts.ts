/**
 * Drafts from the AI (SYS-005, SYS-309; TC-008): every draft shows "Draft, human review
 * required" until a person marks it reviewed, which is recorded in the audit log; and no text
 * from an AI step may claim an approval or airworthiness (owner, 2026-11-16; ADR-039).
 */
import { isUtcDateTime, type AuditEntry } from "@church-logistics/core";
import type { AiStepId } from "../step.ts";

export const DRAFT_LABEL = "Draft, human review required";

/** Claims an AI step must never make: nothing in Prepped or SpareWing approves anything. */
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

export interface Draft {
  readonly stepId: AiStepId;
  readonly text: string;
  /** The draft label until a person marks it reviewed. */
  readonly label: typeof DRAFT_LABEL | null;
  readonly reviewed: {
    readonly personId: string;
    readonly time: string;
  } | null;
}

export type DraftResult =
  | { readonly ok: true; readonly draft: Draft; readonly entry: AuditEntry }
  | { readonly ok: false; readonly reason: string };

/** A new draft, labelled and not yet reviewed. */
export function newDraft(stepId: AiStepId, text: string): Draft {
  return { stepId, text, label: DRAFT_LABEL, reviewed: null };
}

const BAD_TIME =
  "the time is not a valid UTC date and time (YYYY-MM-DDTHH:MM:SSZ)";

/**
 * Marks a draft reviewed by a person, with the audit entry that records who and when. Refused
 * without a person or a valid UTC time, and for a draft already reviewed, so the first reviewer
 * is kept (owner, 2026-11-17; ADR-040). Any person on the team may review a draft: reviewing is
 * not a sign-off (SYS-010). Never throws.
 */
export function markReviewed(
  draft: Draft,
  personId: string,
  time: string,
): DraftResult {
  if (personId.trim() === "") {
    return {
      ok: false,
      reason: "the person marking the draft reviewed is not identified",
    };
  }
  if (!isUtcDateTime(time)) return { ok: false, reason: BAD_TIME };
  if (draft.reviewed !== null) {
    return {
      ok: false,
      reason: `the draft was already marked reviewed by ${draft.reviewed.personId} at ${draft.reviewed.time}`,
    };
  }
  return {
    ok: true,
    draft: { ...draft, label: null, reviewed: { personId, time } },
    entry: {
      time,
      actor: { kind: "person", personId },
      action: `draft from ${draft.stepId} marked reviewed`,
      before: { label: DRAFT_LABEL },
      after: { reviewed: true },
    },
  };
}

/**
 * A person's edit to a draft: the label comes back and the draft needs review again, and the
 * edit is recorded in the audit log (owner, 2026-11-17; ADR-040). Never throws.
 */
export function editDraft(
  draft: Draft,
  text: string,
  personId: string,
  time: string,
): DraftResult {
  if (personId.trim() === "") {
    return {
      ok: false,
      reason: "the person editing the draft is not identified",
    };
  }
  if (!isUtcDateTime(time)) return { ok: false, reason: BAD_TIME };
  if (text.trim() === "")
    return { ok: false, reason: "the edited draft is empty" };
  return {
    ok: true,
    draft: { ...draft, text, label: DRAFT_LABEL, reviewed: null },
    entry: {
      time,
      actor: { kind: "person", personId },
      action: `draft from ${draft.stepId} edited: needs review again`,
      before: { text: draft.text, reviewed: draft.reviewed !== null },
      after: { text, label: DRAFT_LABEL },
    },
  };
}
