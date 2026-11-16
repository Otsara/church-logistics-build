/**
 * Missed community flights (ARC-301; safety-critical): flights scheduled from the disruption's
 * start to its expected end, inclusive, minus those another aircraft and pilot can cover. Only an
 * aircraft at a base the program's rule file lists for the community counts, with a pilot who is a
 * candidate under SYS-303; a pilot with data missing is shown, naming what, but not counted (SYS-307, ADR-015; owner, 2026-11-15).
 * The cover aircraft must be entered as available. An expected end before the start, or no flight
 * days entered, leaves missed flights unknown, as data missing (owner, 2026-11-16; ADR-032).
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
  /** Whether the aircraft is entered as available over the disruption; null when not entered. */
  readonly aircraftAvailable: boolean | null;
  /** The pilot's result from `checkPilot` for this aircraft over the disruption. */
  readonly pilotStatus: SpareWingStatus;
  /** From the same result: what was not entered. */
  readonly pilotMissingData: readonly string[];
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
  /** Null when the dates or the schedule are missing. */
  readonly scheduled: readonly IsoDate[] | null;
  /** Null when unknown: data missing (ADR-032). */
  readonly missed: readonly IsoDate[] | null;
  readonly coveredBy: {
    readonly aircraftId: string;
    readonly pilotId: string;
  } | null;
  /** What was not entered, for example "flight schedule not entered" (SYS-304). */
  readonly missingData: readonly string[];
  readonly reasons: readonly string[];
}

const SWAPPED = "expected end is before the start: check the dates";
const NO_SCHEDULE = "flight schedule not entered";

/** Counts the flights a disruption misses. Never throws; missing data leaves the count unknown. */
export function missedFlights(input: MissedFlightsInput): MissedFlights {
  const days = daysBetween(input.start, input.expectedEnd);
  if (days < 0) {
    return {
      scheduled: null,
      missed: null,
      coveredBy: null,
      missingData: [SWAPPED],
      reasons: [SWAPPED],
    };
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
    } else if (c.aircraftAvailable === null) {
      reasons.push(`${who} not counted: aircraft availability not entered`);
    } else if (!c.aircraftAvailable) {
      reasons.push(`${who} not counted: aircraft not available`);
    } else if (c.pilotStatus === "data_missing") {
      reasons.push(
        `${who} not counted: pilot data missing (${c.pilotMissingData.join("; ")})`,
      );
    } else if (c.pilotStatus === "excluded") {
      reasons.push(`${who} not counted: pilot excluded`);
    } else if (coveredBy === null) {
      coveredBy = { aircraftId: c.aircraftId, pilotId: c.pilotId };
      reasons.push(`covered by ${who}`);
    }
  }
  if (input.flightDays.length === 0) {
    return {
      scheduled: null,
      missed: null,
      coveredBy,
      missingData: [NO_SCHEDULE],
      reasons: [...reasons, `${NO_SCHEDULE}: missed flights unknown`],
    };
  }
  if (coveredBy === null) {
    reasons.push("no aircraft and pilot at a listed base can cover");
  }
  return {
    scheduled,
    missed: coveredBy === null ? scheduled : [],
    coveredBy,
    missingData: [],
    reasons,
  };
}
