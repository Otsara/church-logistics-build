/**
 * Signing off the packing list (ARC-101; SYS-010, IU-102; TC-009; safety-critical). The packing
 * list stays a suggestion until the lead clinician, a pharmacist or clinician, signs it off; the
 * sign-off records who and when in the audit log, and any change to the list afterwards clears
 * it, so the list must be signed off again (owner, 2026-11-10, 2026-11-12 and 2026-11-18;
 * DOC-045 P10). A line must name its lot and a whole-number quantity of 1 or more, and sign-off is
 * allowed while the indicator shows No go: deploying is the lead clinician's decision (owner,
 * 2026-11-18; REV-014, ADR-009). Nothing here says "approved". The time is an input: core never reads the clock.
 * Never throws.
 */
import type { AuditEntry } from "../audit.ts";
import { isUtcDateTime } from "../dates.ts";

/** The one role that signs off the packing list. */
export const SIGNING_ROLE = "lead clinician";

/** One line of the packing list: a lot and the quantity packed from it. */
export interface PackingLine {
  readonly lotId: string;
  readonly quantity: number;
}

/** A sign-off, holding exactly what was signed off. */
export interface PackingSignOff {
  readonly personId: string;
  readonly time: string;
  /** The packing list as signed off, in a fixed order, so any later change shows. */
  readonly signedList: string;
}

export interface SignOffInput {
  readonly lines: readonly PackingLine[];
  /** The role of the person signing off, as signed in. */
  readonly role: string;
  readonly personId: string;
  /** ISO 8601 date-time in UTC, supplied by the caller. */
  readonly time: string;
}

export type SignOffResult =
  | {
      readonly ok: true;
      readonly signOff: PackingSignOff;
      readonly entry: AuditEntry;
    }
  | { readonly ok: false; readonly reason: string };

/** The packing list in a fixed order (each line serialised, then sorted), so the same list always reads the same. */
const listOf = (lines: readonly PackingLine[]): string =>
  `[${lines
    .map((line) => JSON.stringify([line.lotId, line.quantity]))
    .sort()
    .join(",")}]`;

/** Signs off the packing list, or refuses. */
export function signOffPackingList(input: SignOffInput): SignOffResult {
  if (input.role !== SIGNING_ROLE) {
    return {
      ok: false,
      reason:
        "only the lead clinician (a pharmacist or clinician) signs off the packing list",
    };
  }
  if (input.personId.trim() === "") {
    return { ok: false, reason: "the person signing off is not identified" };
  }
  if (!isUtcDateTime(input.time)) {
    return {
      ok: false,
      reason:
        "the time is not a valid UTC date and time (YYYY-MM-DDTHH:MM:SSZ)",
    };
  }
  if (input.lines.length === 0) {
    return {
      ok: false,
      reason: "the packing list is empty: there is nothing to sign off",
    };
  }
  const blank = input.lines.findIndex((line) => line.lotId.trim() === "");
  if (blank !== -1) {
    return {
      ok: false,
      reason: `line ${String(blank + 1)} has no lot id: every line names its lot`,
    };
  }
  const odd = input.lines.find(
    (line) => !Number.isInteger(line.quantity) || line.quantity < 1,
  );
  if (odd !== undefined) {
    return {
      ok: false,
      reason: `lot ${odd.lotId} has quantity ${String(odd.quantity)}: every quantity is a whole number of 1 or more`,
    };
  }
  const twice = input.lines
    .map((line) => line.lotId)
    .filter((id, i, ids) => ids.indexOf(id) !== i);
  if (twice.length > 0) {
    return {
      ok: false,
      reason: `lot ${twice.join(", ")} is on the packing list more than once: correct it before signing off`,
    };
  }
  const signedList = listOf(input.lines);
  return {
    ok: true,
    signOff: { personId: input.personId, time: input.time, signedList },
    entry: {
      time: input.time,
      actor: { kind: "person", personId: input.personId },
      action: "packing list signed off",
      before: { signedOff: false },
      after: { signedOff: true, lines: input.lines.length, signedList },
    },
  };
}

export interface PackingListStatus {
  readonly status: "not signed off" | "signed off" | "changed since sign-off";
  readonly message: string;
}

/** Whether the packing list as it now stands is signed off. */
export function packingListStatus(
  lines: readonly PackingLine[],
  signOff: PackingSignOff | null,
): PackingListStatus {
  if (signOff === null) {
    return {
      status: "not signed off",
      message:
        "Suggestion: the lead clinician has not signed off this packing list",
    };
  }
  return listOf(lines) === signOff.signedList
    ? {
        status: "signed off",
        message: `Signed off by ${signOff.personId} at ${signOff.time}`,
      }
    : {
        status: "changed since sign-off",
        message: `Changed since ${signOff.personId} signed it off at ${signOff.time}: the lead clinician signs it off again`,
      };
}
