/**
 * Missed community flights (ARC-301; safety-critical): flights scheduled from the disruption's
 * start to its expected end, inclusive, minus those another aircraft and pilot can cover. Only an
 * aircraft at a base the program's rule file lists for the community counts, with a pilot who is a
 * candidate under SYS-303; an unknown pilot is shown but not counted (SYS-307, ADR-015).
 */
import {
  addDays,
  daysBetween,
  weekday,
  type IsoDate,
  type Weekday,
} from "../dates.ts";
import type { SpareWingStatus } from "../result.ts";

export interface CoverOption {
  readonly aircraftId: string;
  readonly baseId: string;
  readonly pilotId: string;
  /** The pilot's result from `checkPilot` for this aircraft over the disruption. */
  readonly pilotStatus: SpareWingStatus;
}

export interface MissedFlightsInput {
  readonly flightDays: readonly Weekday[];
  readonly start: IsoDate;
  readonly expectedEnd: IsoDate;
  /** Bases the program lists as able to cover this community. */
  readonly coverBaseIds: readonly string[];
  readonly cover: readonly CoverOption[];
}

export interface MissedFlights {
  readonly scheduled: readonly IsoDate[];
  readonly missed: readonly IsoDate[];
  readonly coveredBy: {
    readonly aircraftId: string;
    readonly pilotId: string;
  } | null;
  readonly reasons: readonly string[];
}

/** Counts the flights a disruption misses. Throws a RangeError if the end is before the start. */
export function missedFlights(input: MissedFlightsInput): MissedFlights {
  const days = daysBetween(input.start, input.expectedEnd);
  if (days < 0) {
    throw new RangeError(
      `expected end ${input.expectedEnd} is before the start ${input.start}`,
    );
  }
  const scheduled: IsoDate[] = [];
  for (let i = 0; i <= days; i++) {
    const day = addDays(input.start, i);
    if (input.flightDays.includes(weekday(day))) scheduled.push(day);
  }
  const reasons: string[] = [];
  let coveredBy: MissedFlights["coveredBy"] = null;
  for (const c of input.cover) {
    const who = `${c.aircraftId} with ${c.pilotId} at ${c.baseId}`;
    if (!input.coverBaseIds.includes(c.baseId)) {
      reasons.push(
        `${who} not counted: ${c.baseId} is not listed to cover this community`,
      );
    } else if (c.pilotStatus !== "candidate") {
      reasons.push(`${who} not counted: pilot ${c.pilotStatus}`);
    } else if (coveredBy === null) {
      coveredBy = { aircraftId: c.aircraftId, pilotId: c.pilotId };
      reasons.push(`covered by ${who}`);
    }
  }
  if (coveredBy === null) {
    reasons.push("no aircraft and pilot at a listed base can cover");
  }
  return {
    scheduled,
    missed: coveredBy === null ? scheduled : [],
    coveredBy,
    reasons,
  };
}
