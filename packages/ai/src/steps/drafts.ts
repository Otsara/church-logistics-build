/**
 * Drafts from the AI (SYS-005, SYS-309; TC-008): every draft shows "Draft, human review
 * required" until a person marks it reviewed, which is recorded in the audit log; and no text
 * from an AI step may claim an approval or airworthiness (owner, 2026-11-16; ADR-039).
 */
import type { AuditEntry } from "@church-logistics/core";
import type { AiStepId } from "../step.ts";

export const DRAFT_LABEL = "Draft, human review required";

/** Claims an AI step must never make: nothing in Prepped or SpareWing approves anything. */
export const FORBIDDEN_CLAIMS = [
  "approved", // eslint-disable-line no-restricted-syntax -- the list this check refuses (SYS-309)
  "airworthy",
  "flightworthy",
  "safe to fly",
  "cleared",
] as const;

/** The claims, written for a prompt: "approved, airworthy, flightworthy, safe to fly or cleared". */
export const FORBIDDEN_IN_WORDS = `${FORBIDDEN_CLAIMS.slice(0, -1).join(", ")} or ${FORBIDDEN_CLAIMS.slice(-1).join("")}`;

/** The forbidden claims in the text, in list order, ignoring letter case. */
export function forbiddenClaims(text: string): string[] {
  return FORBIDDEN_CLAIMS.filter((word) =>
    new RegExp(`(?<![\\p{L}])${word}(?![\\p{L}])`, "iu").test(text),
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

/** A new draft, labelled and not yet reviewed. */
export function newDraft(stepId: AiStepId, text: string): Draft {
  return { stepId, text, label: DRAFT_LABEL, reviewed: null };
}

/** Marks a draft reviewed by a person, with the audit entry that records who and when. */
export function markReviewed(
  draft: Draft,
  personId: string,
  time: string,
): { readonly draft: Draft; readonly entry: AuditEntry } {
  return {
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
