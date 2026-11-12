/**
 * Prepped lot eligibility (ARC-101; safety-critical): whether one donated lot may be packed for
 * a trip. Pure: every date is an input, nothing reads the clock, and no AI step is involved
 * (SYS-003, TC-108).
 *
 * The status, in order of precedence:
 * - "discard": the expiry date has passed on the date of the check (SYS-116);
 * - "blocked": controlled (SYS-103), cold chain (SYS-104), outside scope (SYS-109), or less than
 *   the minimum shelf life at arrival (SYS-101, SYS-102);
 * - "needs_review": no readable expiry date (SYS-105);
 * - "eligible": none of the above. Still subject to the clinician's sign-off.
 * Every reason that applies is listed, so a person can see why without guessing.
 */
import { daysBetween, type IsoDate } from "../dates.ts";
import type { PreppedStatus, RuleOutcome } from "../result.ts";
import { readExpiry } from "./expiry.ts";

/** What eligibility needs to know about one lot. Scope and controlled status come from its catalogue entry. */
export interface LotFacts {
  readonly id: string;
  /** The expiry as entered: YYYY-MM-DD, or month and year only as MM/YYYY (OD-043); null if none. */
  readonly expiry: string | null;
  readonly controlled: "yes" | "no";
  /** Where the controlled status comes from, for example "FDA drug directory: DEA schedule CII" (SYS-103). */
  readonly controlledBasis: string;
  readonly coldChain: boolean;
  readonly inScope: boolean;
  /** Why the catalogue entry is out of scope, when it is (SYS-109). */
  readonly scopeReason: string | null;
}

/** The trip-specific inputs. The minimum is a placeholder pending OD-002. */
export interface EligibilityRules {
  readonly arrival: IsoDate;
  /** The date the check is made; lots already past expiry on this date are discarded (SYS-116). */
  readonly checkDate: IsoDate;
  /** Minimum days of shelf life remaining at arrival; a lot with exactly this many passes (SYS-102, OD-009). */
  readonly minimumDaysAtArrival: number;
}

export interface LotEligibility extends RuleOutcome<PreppedStatus> {
  readonly lotId: string;
  /** The expiry as read, or null when there is none or it could not be read. */
  readonly expiry: IsoDate | null;
  /** True when the expiry was printed as month and year only and read as the month's last day. */
  readonly expiryMonthOnly: boolean;
  /** Expiry date minus arrival date (SYS-101); null without a readable expiry. */
  readonly daysRemaining: number | null;
}

export const COLD_CHAIN_REASON =
  "cold-chain items are not handled in this build";
export const DISCARD_REASON = "Discard: expired";
const OUT_OF_SCOPE = "outside this build's scope";

const controlledReason = (basis: string): string =>
  `controlled substance (${basis}): cannot be packed in this build`;

/** The scope reason, said once even when the catalogue's own reason already starts with it. */
const scopeReason = (reason: string | null): string =>
  reason === null
    ? OUT_OF_SCOPE
    : reason.startsWith(OUT_OF_SCOPE)
      ? reason
      : `${OUT_OF_SCOPE}: ${reason}`;

/** Checks one lot against the trip. Never throws for any lot; missing data becomes "needs_review". */
export function checkLot(
  lot: LotFacts,
  rules: EligibilityRules,
): LotEligibility {
  const blocks: string[] = [];
  if (lot.controlled === "yes")
    blocks.push(controlledReason(lot.controlledBasis));
  if (lot.coldChain) blocks.push(COLD_CHAIN_REASON);
  if (!lot.inScope) blocks.push(scopeReason(lot.scopeReason));

  const reading = readExpiry(lot.expiry);
  if (!reading.ok) {
    return {
      lotId: lot.id,
      status: blocks.length > 0 ? "blocked" : "needs_review",
      reasons: [...blocks, reading.reason],
      expiry: null,
      expiryMonthOnly: false,
      daysRemaining: null,
    };
  }

  const { date, monthOnly, text } = reading.expiry;
  const note = monthOnly
    ? [`expiry read from a month-only date (${text}) as ${date}`]
    : [];
  const daysRemaining = daysBetween(rules.arrival, date);
  const result = {
    lotId: lot.id,
    expiry: date,
    expiryMonthOnly: monthOnly,
    daysRemaining,
  };

  if (daysBetween(rules.checkDate, date) < 0) {
    return {
      ...result,
      status: "discard",
      reasons: [...blocks, DISCARD_REASON, ...note],
    };
  }
  const shortShelfLife = daysRemaining < rules.minimumDaysAtArrival;
  return {
    ...result,
    status: blocks.length > 0 || shortShelfLife ? "blocked" : "eligible",
    reasons: [
      ...blocks,
      `${String(daysRemaining)} days remaining, ${String(rules.minimumDaysAtArrival)} required`,
      ...note,
    ],
  };
}
