/**
 * Recording a decision on a SpareWing proposal (ARC-301; safety-critical). A proposal becomes a
 * decision only when the flight base director, mechanic or pilot records it (SYS-309, ADR-002);
 * nothing in SpareWing approves a schedule change or states that an aircraft is flightworthy.
 * The time must be a valid UTC date and time, and the option one in the ranked list (owner,
 * 2026-11-16; ADR-032).
 */
import type { AuditEntry } from "../audit.ts";
import { isIsoDate } from "../dates.ts";

export const DECIDING_ROLES = [
  "flight base director",
  "mechanic",
  "pilot",
] as const;

export interface DecisionInput {
  readonly optionId: string;
  /** The ids of the options in the ranked list the decision is made on. */
  readonly optionIds: readonly string[];
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

const UTC_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

/** A real UTC date and time: the right form, a date the calendar has, and a time of day. */
const isUtcTime = (time: string): boolean =>
  UTC_TIME.test(time) &&
  isIsoDate(time.slice(0, 10)) &&
  Number(time.slice(11, 13)) <= 23 &&
  Number(time.slice(14, 16)) <= 59 &&
  Number(time.slice(17, 19)) <= 59;

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
  if (!isUtcTime(input.time)) {
    return {
      ok: false,
      reason:
        "the time is not a valid UTC date and time (YYYY-MM-DDTHH:MM:SSZ)",
    };
  }
  if (!input.optionIds.includes(input.optionId)) {
    return {
      ok: false,
      reason: `option ${input.optionId} is not in the ranked list`,
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
