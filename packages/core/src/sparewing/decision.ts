/**
 * Recording a decision on a SpareWing proposal (ARC-301; safety-critical). A proposal becomes a
 * decision only when the flight base director, mechanic or pilot records it (SYS-309, ADR-002);
 * nothing in SpareWing approves a schedule change or states that an aircraft is flightworthy.
 */
import type { AuditEntry } from "../audit.ts";

export const DECIDING_ROLES = [
  "flight base director",
  "mechanic",
  "pilot",
] as const;

export interface DecisionInput {
  readonly optionId: string;
  readonly decision: "chosen" | "rejected";
  /** The role of the person recording it, as signed in. */
  readonly role: string;
  readonly personId: string;
  /** ISO 8601 date-time in UTC, supplied by the caller (core never reads the clock). */
  readonly time: string;
}

export type DecisionResult =
  | { readonly ok: true; readonly entry: AuditEntry }
  | { readonly ok: false; readonly reason: string };

/** Records a person's decision as an audit entry, or refuses it. Never throws. */
export function recordDecision(input: DecisionInput): DecisionResult {
  if (!(DECIDING_ROLES as readonly string[]).includes(input.role)) {
    return {
      ok: false,
      reason:
        "only the flight base director, mechanic or pilot records a decision",
    };
  }
  if (input.personId.trim() === "") {
    return {
      ok: false,
      reason: "the person recording the decision is not identified",
    };
  }
  return {
    ok: true,
    entry: {
      time: input.time,
      actor: { kind: "person", personId: input.personId },
      action: `decision recorded by the ${input.role}: option ${input.optionId} ${input.decision}`,
      before: null,
      after: {
        optionId: input.optionId,
        decision: input.decision,
        role: input.role,
      },
    },
  };
}
