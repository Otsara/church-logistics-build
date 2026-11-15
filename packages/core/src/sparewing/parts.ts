/**
 * SpareWing part candidates (ARC-301; safety-critical). A stocked part is a candidate only if it
 * has the needed part number, or a number the program entered as an alternate for the needed part;
 * the tool never decides that two parts are interchangeable (SYS-301). Parts marked not
 * serviceable, or with none in stock, never appear (SYS-302). Every candidate carries the sign-off
 * flag (SYS-305), and an alternate also the interchange a person must confirm (owner, 2026-11-15). ETAs come only from entered lead times; otherwise "unverified" (SYS-304).
 * Part numbers match ignoring leading and trailing spaces and letter case; every other character,
 * dashes included, must match. A base holding fewer than needed is still listed, marked with how
 * many it holds (owner, 2026-11-15; ADR-030).
 */
import { addDays, type IsoDate } from "../dates.ts";

export const SIGN_OFF_FLAG =
  "requires sign-off by a licensed mechanic or the operator";

/** A part in a base's stock, as entered by the program. */
export interface StockPart {
  readonly id: string;
  readonly partNumber: string;
  readonly baseId: string;
  readonly quantity: number;
  readonly serviceable: boolean;
}

/** A way of moving parts between two bases, with the program's entered lead time. */
export interface TransferMode {
  readonly fromBaseId: string;
  readonly toBaseId: string;
  readonly mode: "air" | "mail" | "road";
  readonly leadTimeDays: number | null;
}

export interface PartNeed {
  readonly partNumber: string;
  /** Part numbers the program entered as alternates for the needed part (SYS-301). */
  readonly alternates: readonly string[];
  readonly aircraftBaseId: string;
  /** The date the search is made; ETAs count from it. Rules never read the clock. */
  readonly asOf: IsoDate;
  /** The local order lead time, if the program entered one (SYS-306). */
  readonly orderLeadTimeDays: number | null;
  /** How many of the part are needed; null when not entered (owner, 2026-11-15; ADR-030). */
  readonly quantityNeeded: number | null;
}

export interface PartCandidate {
  readonly partId: string;
  readonly partNumber: string;
  readonly match: "same part number" | "listed alternate";
  readonly sourceBaseId: string;
  readonly quantity: number;
  readonly transferMode: TransferMode["mode"] | "on site" | null;
  readonly leadTimeDays: number | null;
  readonly eta: IsoDate | "unverified";
  readonly reasons: readonly string[];
  readonly flag: typeof SIGN_OFF_FLAG;
  /** For a listed alternate: the interchange a person must confirm (owner, 2026-11-15; S1). */
  readonly interchange: string | null;
  /** Whether the base holds the quantity needed; null when the quantity needed is not entered. */
  readonly holdsEnough: boolean | null;
}

export interface PartSearch {
  readonly candidates: readonly PartCandidate[];
  /** Set only when there are no candidates (SYS-306). */
  readonly noCandidates: {
    readonly message: string;
    readonly orderLeadTime: string;
  } | null;
}

/** A whole number of days, 0 or more; anything else counts as not entered (SYS-304, SYS-306). */
const isDays = (n: number | null): n is number =>
  n !== null && Number.isInteger(n) && n >= 0;

/** A part number as compared: no leading or trailing spaces, letter case ignored (ADR-030). */
const comparable = (partNumber: string): string =>
  partNumber.trim().toUpperCase();

/** Finds the part candidates for a need. Never throws. */
export function findPartCandidates(
  need: PartNeed,
  parts: readonly StockPart[],
  transferModes: readonly TransferMode[],
): PartSearch {
  const candidates: PartCandidate[] = [];
  const needed = need.partNumber.trim();
  const alternates = need.alternates.map(comparable);
  const quantityNeeded =
    need.quantityNeeded !== null &&
    Number.isInteger(need.quantityNeeded) &&
    need.quantityNeeded > 0
      ? need.quantityNeeded
      : null;
  for (const part of parts) {
    if (!part.serviceable || !(part.quantity > 0)) continue;
    const same = comparable(part.partNumber) === comparable(needed);
    if (!same && !alternates.includes(comparable(part.partNumber))) continue;
    const holdsEnough =
      quantityNeeded === null ? null : part.quantity >= quantityNeeded;
    const quantityNote =
      quantityNeeded === null
        ? ["quantity needed not entered: check the base holds enough"]
        : holdsEnough === true
          ? []
          : [
              `holds ${String(part.quantity)} of ${String(quantityNeeded)} needed`,
            ];
    const base: Omit<
      PartCandidate,
      "transferMode" | "leadTimeDays" | "eta" | "reasons"
    > = {
      partId: part.id,
      partNumber: part.partNumber,
      match: same
        ? ("same part number" as const)
        : ("listed alternate" as const),
      sourceBaseId: part.baseId,
      quantity: part.quantity,
      flag: SIGN_OFF_FLAG,
      holdsEnough,
      interchange: same
        ? null
        : `interchange with ${needed} to be confirmed by the pilot, mechanic or flight base director before use`,
    };
    const matchReason = same
      ? "same part number"
      : `listed by the program as an alternate for ${needed}`;
    if (part.baseId === need.aircraftBaseId) {
      candidates.push({
        ...base,
        transferMode: "on site",
        leadTimeDays: 0,
        eta: need.asOf,
        reasons: [matchReason, "at the aircraft's base", ...quantityNote],
      });
      continue;
    }
    const route = `from ${part.baseId} to ${need.aircraftBaseId}`;
    const modes = transferModes.filter(
      (t) => t.fromBaseId === part.baseId && t.toBaseId === need.aircraftBaseId,
    );
    if (modes.length === 0) {
      candidates.push({
        ...base,
        transferMode: null,
        leadTimeDays: null,
        eta: "unverified",
        reasons: [
          matchReason,
          `no transfer mode entered ${route}: ETA unverified`,
          ...quantityNote,
        ],
      });
      continue;
    }
    for (const t of modes) {
      const known = isDays(t.leadTimeDays);
      candidates.push({
        ...base,
        transferMode: t.mode,
        leadTimeDays: known ? t.leadTimeDays : null,
        eta: known ? addDays(need.asOf, t.leadTimeDays) : "unverified",
        reasons: [
          matchReason,
          known
            ? `${t.mode} ${route}: ${String(t.leadTimeDays)} days`
            : `${t.mode} ${route}: no lead time entered, ETA unverified`,
          ...quantityNote,
        ],
      });
    }
  }
  return {
    candidates,
    noCandidates:
      candidates.length > 0
        ? null
        : {
            message:
              "No candidates found: ask a person (the mechanic or another base) before deciding",
            orderLeadTime: isDays(need.orderLeadTimeDays)
              ? `order lead time entered: ${String(need.orderLeadTimeDays)} days`
              : "no order lead time entered",
          },
  };
}
