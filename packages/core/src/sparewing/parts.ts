/**
 * SpareWing part candidates (ARC-301; safety-critical). A stocked part is a candidate only if it
 * has the needed part number, or a number the program entered as an alternate for the needed part;
 * the tool never decides that two parts are interchangeable (SYS-301). Parts marked not
 * serviceable, or with none in stock, never appear (SYS-302). Every candidate carries the sign-off
 * flag (SYS-305). ETAs come only from entered lead times; otherwise "unverified" (SYS-304).
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
}

export interface PartSearch {
  readonly candidates: readonly PartCandidate[];
  /** Set only when there are no candidates (SYS-306). */
  readonly noCandidates: {
    readonly message: string;
    readonly orderLeadTime: string;
  } | null;
}

/** Finds the part candidates for a need. Never throws. */
export function findPartCandidates(
  need: PartNeed,
  parts: readonly StockPart[],
  transferModes: readonly TransferMode[],
): PartSearch {
  const candidates: PartCandidate[] = [];
  for (const part of parts) {
    if (!part.serviceable || !(part.quantity > 0)) continue;
    const same = part.partNumber === need.partNumber;
    if (!same && !need.alternates.includes(part.partNumber)) continue;
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
    };
    const matchReason = same
      ? "same part number"
      : `listed by the program as an alternate for ${need.partNumber}`;
    if (part.baseId === need.aircraftBaseId) {
      candidates.push({
        ...base,
        transferMode: "on site",
        leadTimeDays: 0,
        eta: need.asOf,
        reasons: [matchReason, "at the aircraft's base"],
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
        ],
      });
      continue;
    }
    for (const t of modes) {
      const known =
        t.leadTimeDays !== null &&
        Number.isInteger(t.leadTimeDays) &&
        t.leadTimeDays >= 0;
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
            orderLeadTime:
              need.orderLeadTimeDays === null
                ? "no order lead time entered"
                : `order lead time entered: ${String(need.orderLeadTimeDays)} days`,
          },
  };
}
