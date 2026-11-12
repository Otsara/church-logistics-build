/**
 * Synthetic SpareWing data (DAT-301, ADR-005): fully synthetic bases, aircraft, parts, pilots,
 * communities, transfer modes and disruptions. Identifiers use made-up formats that cannot be
 * mistaken for real registrations or manufacturers' part numbers.
 */
import type { IsoDate } from "@church-logistics/core";
import { addDays } from "./dates.ts";
import { createRng } from "./rng.ts";
import { inventedWord, personName } from "./words.ts";

export const WEEKDAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** Made-up identifier formats (DAT-301). */
export const AIRCRAFT_ID = /^SW-A\d{2}$/;
export const PART_NUMBER = /^SWP-\d{4}-\d$/;

export interface SyntheticBase {
  readonly id: string;
  readonly name: string;
  readonly roadAccess: boolean;
}
export interface SyntheticAircraft {
  readonly id: string;
  readonly type: string;
  readonly baseId: string;
  readonly status: "flying" | "grounded" | "in maintenance";
}
export interface SyntheticPart {
  readonly id: string;
  readonly partNumber: string;
  readonly alternates: readonly string[];
  readonly description: string;
  readonly baseId: string;
  readonly quantity: number;
  readonly serviceable: boolean;
}
export interface SyntheticPilot {
  readonly id: string;
  readonly name: string;
  readonly baseId: string;
  readonly ratings: readonly string[];
  /** Null when the program has not entered currency (SYS-304: shown as unknown). */
  readonly currencyUntil: IsoDate | null;
  /** Null when availability is unknown. */
  readonly availability:
    readonly { readonly from: IsoDate; readonly to: IsoDate }[] | null;
}
export interface SyntheticCommunity {
  readonly id: string;
  readonly name: string;
  readonly baseId: string;
  readonly flightDays: readonly Weekday[];
}
export interface SyntheticTransferMode {
  readonly fromBaseId: string;
  readonly toBaseId: string;
  readonly mode: "air" | "mail" | "road";
  /** Null when no lead time was entered (SYS-304: ETA shown as unverified). */
  readonly leadTimeDays: number | null;
}
export interface SyntheticDisruption {
  readonly id: string;
  readonly kind: "part" | "pilot";
  readonly subjectId: string;
  readonly start: IsoDate;
  readonly expectedEnd: IsoDate;
}

export interface SpareWingData {
  readonly synthetic: true;
  readonly seed: number;
  readonly baseDate: IsoDate;
  readonly bases: readonly SyntheticBase[];
  readonly aircraft: readonly SyntheticAircraft[];
  readonly parts: readonly SyntheticPart[];
  readonly pilots: readonly SyntheticPilot[];
  readonly communities: readonly SyntheticCommunity[];
  readonly transferModes: readonly SyntheticTransferMode[];
  readonly disruptions: readonly SyntheticDisruption[];
}

export interface SpareWingOptions {
  readonly seed: number;
  readonly baseDate: IsoDate;
  readonly bases?: number;
  readonly aircraft?: number;
  readonly parts?: number;
  readonly pilots?: number;
  readonly communities?: number;
}

const TYPES = [
  "Type K1 (synthetic)",
  "Type K2 (synthetic)",
  "Type K3 (synthetic)",
] as const;
const pad = (n: number, width: number): string =>
  String(n).padStart(width, "0");

/** Generates a SpareWing scenario. The same options always give identical data (TC-005). */
export function generateSpareWing(options: SpareWingOptions): SpareWingData {
  const { seed, baseDate } = options;
  const rng = createRng(seed);
  const bases: SyntheticBase[] = [];
  for (let i = 1; i <= (options.bases ?? 3); i += 1) {
    bases.push({
      id: `B${pad(i, 2)}`,
      name: `${inventedWord(rng)} Base`,
      roadAccess: rng.chance(0.5),
    });
  }
  const aircraft: SyntheticAircraft[] = [];
  for (let i = 1; i <= (options.aircraft ?? 4); i += 1) {
    aircraft.push({
      id: `SW-A${pad(i, 2)}`,
      type: rng.pick(TYPES),
      baseId: rng.pick(bases).id,
      status:
        i === 1
          ? "grounded"
          : rng.pick(["flying", "flying", "in maintenance"] as const),
    });
  }
  const partNumbers: string[] = [];
  const parts: SyntheticPart[] = [];
  for (let i = 1; i <= (options.parts ?? 12); i += 1) {
    const partNumber = `SWP-${pad(rng.int(0, 9999), 4)}-${String(rng.int(0, 9))}`;
    const alternates =
      partNumbers.length > 0 && rng.chance(0.3) ? [rng.pick(partNumbers)] : [];
    partNumbers.push(partNumber);
    parts.push({
      id: `P${pad(i, 3)}`,
      partNumber,
      alternates,
      description: `Synthetic part ${inventedWord(rng)}`,
      baseId: rng.pick(bases).id,
      quantity: rng.int(0, 4),
      serviceable: rng.chance(0.85),
    });
  }
  const pilots: SyntheticPilot[] = [];
  for (let i = 1; i <= (options.pilots ?? 5); i += 1) {
    const from = addDays(baseDate, rng.int(0, 10));
    pilots.push({
      id: `PIL${pad(i, 2)}`,
      name: personName(rng),
      baseId: rng.pick(bases).id,
      ratings: [rng.pick(TYPES)],
      currencyUntil: rng.chance(0.15)
        ? null
        : addDays(baseDate, rng.int(-30, 365)),
      availability: rng.chance(0.15)
        ? null
        : [{ from, to: addDays(from, rng.int(1, 14)) }],
    });
  }
  const communities: SyntheticCommunity[] = [];
  for (let i = 1; i <= (options.communities ?? 6); i += 1) {
    const first = rng.int(0, 6);
    const second = (first + rng.int(1, 6)) % 7;
    const days = [first, second]
      .sort((a, b) => a - b)
      .map((d) => WEEKDAYS[d] as Weekday);
    communities.push({
      id: `C${pad(i, 2)}`,
      name: inventedWord(rng),
      baseId: rng.pick(bases).id,
      flightDays: days,
    });
  }
  const transferModes: SyntheticTransferMode[] = [];
  for (const from of bases) {
    for (const to of bases) {
      if (from.id === to.id) continue;
      transferModes.push({
        fromBaseId: from.id,
        toBaseId: to.id,
        mode: rng.pick(["air", "mail", "road"] as const),
        leadTimeDays: rng.chance(0.2) ? null : rng.int(1, 10),
      });
    }
  }
  const grounded = aircraft.find((a) => a.status === "grounded");
  const start = addDays(baseDate, rng.int(0, 7));
  const disruptions: SyntheticDisruption[] = grounded
    ? [
        {
          id: "DIS01",
          kind: "part",
          subjectId: grounded.id,
          start,
          expectedEnd: addDays(start, rng.int(2, 10)),
        },
      ]
    : [];
  return {
    synthetic: true,
    seed,
    baseDate,
    bases,
    aircraft,
    parts,
    pilots,
    communities,
    transferModes,
    disruptions,
  };
}
