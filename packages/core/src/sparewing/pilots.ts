/**
 * SpareWing pilot candidates (ARC-301; safety-critical). A pilot is a candidate only if the entered
 * ratings meet the aircraft type's requirement plus the aircraft's own, currency holds from the
 * date needed through the expected end of the disruption, and entered availability covers every
 * day of it (SYS-303, ADR-015). Anything not entered is "data missing", naming what, never a silent pass or
 * exclusion (SYS-304); something known that rules the pilot out outweighs it. Pilots are named by
 * id only (ARC-013). Fitness to fly is never judged (IU-302). Ratings match ignoring leading and
 * trailing spaces and letter case; an aircraft with no required ratings entered, or an expected end
 * before the date needed, is data missing for every pilot (owner, 2026-11-16; ADR-032).
 */
import { addDays, daysBetween, type IsoDate } from "../dates.ts";
import type { RuleOutcome, SpareWingStatus } from "../result.ts";
import { SIGN_OFF_FLAG } from "./parts.ts";

export interface Pilot {
  readonly id: string;
  readonly baseId: string;
  readonly ratings: readonly string[] | null;
  /** The last day the pilot's entered currency holds. */
  readonly currencyUntil: IsoDate | null;
  readonly availability:
    readonly { readonly from: IsoDate; readonly to: IsoDate }[] | null;
}

export interface PilotNeed {
  /** Ratings from the aircraft type's rule file (ADR-015). */
  readonly typeRatings: readonly string[];
  /** Extra ratings entered on the individual aircraft. */
  readonly aircraftRatings: readonly string[];
  readonly neededFrom: IsoDate;
  readonly expectedEnd: IsoDate;
}

export interface PilotResult extends RuleOutcome<SpareWingStatus> {
  readonly pilotId: string;
  /** What was not entered, for example "availability not entered" (owner, 2026-11-15). */
  readonly missingData: readonly string[];
  readonly baseId: string;
  readonly flag: typeof SIGN_OFF_FLAG;
}

type Check = {
  readonly reason: string;
  readonly effect: "ok" | "missing" | "excluded";
};

/** A rating as compared: no leading or trailing spaces, letter case ignored (ADR-032). */
const comparable = (rating: string): string => rating.trim().toUpperCase();

/** The required ratings, trimmed, each once whatever its letter case; blanks dropped. */
function requiredRatings(need: PilotNeed): string[] {
  const byKey = new Map<string, string>();
  for (const r of [...need.typeRatings, ...need.aircraftRatings]) {
    const text = r.trim();
    if (text !== "" && !byKey.has(comparable(text)))
      byKey.set(comparable(text), text);
  }
  return [...byKey.values()];
}

function ratings(pilot: Pilot, required: readonly string[]): Check {
  if (required.length === 0)
    return {
      reason: "required ratings not entered for this aircraft",
      effect: "missing",
    };
  if (pilot.ratings === null)
    return { reason: "ratings not entered", effect: "missing" };
  const held = pilot.ratings.map(comparable);
  const missing = required.filter((r) => !held.includes(comparable(r)));
  return missing.length > 0
    ? { reason: `missing ${missing.join(", ")}`, effect: "excluded" }
    : { reason: `holds ${required.join(", ")}`, effect: "ok" };
}

function currency(pilot: Pilot, need: PilotNeed): Check {
  const until = pilot.currencyUntil;
  if (until === null)
    return { reason: "currency not entered", effect: "missing" };
  if (daysBetween(need.neededFrom, until) < 0)
    return { reason: `currency lapsed on ${until}`, effect: "excluded" };
  if (daysBetween(need.expectedEnd, until) < 0)
    return {
      reason: `currency lapses on ${until}, before the expected end ${need.expectedEnd}`,
      effect: "excluded",
    };
  return { reason: `current until ${until}`, effect: "ok" };
}

function availability(pilot: Pilot, need: PilotNeed): Check {
  const windows = pilot.availability;
  if (windows === null)
    return { reason: "availability not entered", effect: "missing" };
  const days = daysBetween(need.neededFrom, need.expectedEnd);
  for (let i = 0; i <= days; i++) {
    const day = addDays(need.neededFrom, i);
    const free = windows.some(
      (w) => daysBetween(w.from, day) >= 0 && daysBetween(day, w.to) >= 0,
    );
    if (!free) return { reason: `not available on ${day}`, effect: "excluded" };
  }
  return {
    reason: `available ${need.neededFrom} to ${need.expectedEnd}`,
    effect: "ok",
  };
}

/** Checks one pilot against the need. Never throws for any pilot. */
export function checkPilot(pilot: Pilot, need: PilotNeed): PilotResult {
  const swapped = daysBetween(need.neededFrom, need.expectedEnd) < 0;
  const checks: Check[] = [
    ratings(pilot, requiredRatings(need)),
    ...(swapped
      ? [
          {
            reason: "expected end is before the date needed: check the dates",
            effect: "missing" as const,
          },
        ]
      : [currency(pilot, need), availability(pilot, need)]),
  ];
  const effects = checks.map((c) => c.effect);
  return {
    pilotId: pilot.id,
    baseId: pilot.baseId,
    status: effects.includes("excluded")
      ? "excluded"
      : effects.includes("missing")
        ? "data_missing"
        : "candidate",
    reasons: checks.map((c) => c.reason),
    missingData: checks
      .filter((c) => c.effect === "missing")
      .map((c) => c.reason),
    flag: SIGN_OFF_FLAG,
  };
}
