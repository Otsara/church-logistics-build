/**
 * Synthetic Prepped data (DAT-001, DAT-101, ADR-005): donors, lots, trips and floor lists built
 * from catalog entries. Every number here is a synthetic generator setting, not clinical guidance.
 */
import type { IsoDate } from "@church-logistics/core";
import { addDays } from "./dates.ts";
import type { CatalogEntry, Controlled } from "./fda.ts";
import { createRng } from "./rng.ts";

export interface SyntheticDonor {
  readonly id: string;
  readonly name: string;
  readonly type: "hospital" | "pharmacy" | "clinic";
}

export interface SyntheticLot {
  readonly id: string;
  readonly donorId: string;
  readonly catalogSourceId: string;
  readonly genericName: string;
  readonly dosageForm: string;
  readonly strength: string | null;
  readonly quantity: number;
  readonly lotNumber: string;
  readonly expiry: IsoDate;
  readonly controlled: Controlled;
  /** Synthetic: the FDA directory does not record storage (DAT-101). */
  readonly coldChain: boolean;
  readonly sourceLine: string;
}

export interface SyntheticTrip {
  readonly id: string;
  readonly destination: string;
  readonly arrival: IsoDate;
  readonly teamSize: number;
  readonly expectedPatients: number;
  readonly importPermitObtained: boolean;
}

export interface SyntheticFloorItem {
  readonly tripId: string;
  readonly catalogSourceId: string;
  readonly genericName: string;
  readonly dosageForm: string;
  readonly strength: string | null;
  /** A synthetic stand-in for the lead clinician's target (SYS-110). */
  readonly target: number;
  readonly priority: 1 | 2 | 3;
}

export interface PreppedData {
  readonly synthetic: true;
  readonly seed: number;
  readonly baseDate: IsoDate;
  readonly donors: readonly SyntheticDonor[];
  readonly lots: readonly SyntheticLot[];
  readonly trips: readonly SyntheticTrip[];
  readonly floorItems: readonly SyntheticFloorItem[];
}

export interface PreppedOptions {
  readonly seed: number;
  /** The date the scenario is built around; the generator never reads the clock. */
  readonly baseDate: IsoDate;
  readonly catalog: readonly CatalogEntry[];
  readonly donors?: number;
  readonly lots?: number;
  readonly trips?: number;
  readonly floorItemsPerTrip?: number;
}

const DESTINATIONS = [
  "Honduras",
  "Ethiopia",
  "Philippines",
  "Nigeria",
] as const;
const DONOR_TYPES = ["hospital", "pharmacy", "clinic"] as const;
const pad = (n: number, width: number): string =>
  String(n).padStart(width, "0");

/** Generates a Prepped scenario. The same options always give identical data (TC-005). */
export function generatePrepped(options: PreppedOptions): PreppedData {
  const { seed, baseDate, catalog } = options;
  if (catalog.length === 0)
    throw new RangeError("generatePrepped() needs at least one catalog entry");
  const rng = createRng(seed);
  const donors: SyntheticDonor[] = [];
  for (let i = 1; i <= (options.donors ?? 6); i += 1) {
    const type = rng.pick(DONOR_TYPES);
    donors.push({
      id: `D${pad(i, 3)}`,
      name: `Synthetic ${type} donor D${pad(i, 3)}`,
      type,
    });
  }
  const lots: SyntheticLot[] = [];
  for (let i = 1; i <= (options.lots ?? 40); i += 1) {
    const entry = rng.pick(catalog);
    const donor = rng.pick(donors);
    const quantity = rng.int(10, 500);
    const expiry = addDays(baseDate, rng.int(-60, 900));
    const lotNumber = `L${pad(rng.int(0, 999999), 6)}`;
    lots.push({
      id: `LOT${pad(i, 4)}`,
      donorId: donor.id,
      catalogSourceId: entry.sourceId,
      genericName: entry.genericName,
      dosageForm: entry.dosageForm,
      strength: entry.strength,
      quantity,
      lotNumber,
      expiry,
      controlled: entry.controlled,
      coldChain: rng.chance(0.1),
      sourceLine:
        `${entry.genericName} ${entry.strength ?? ""} ${entry.dosageForm} x${String(quantity)} lot ${lotNumber} exp ${expiry}`.replace(
          /\s+/g,
          " ",
        ),
    });
  }
  const trips: SyntheticTrip[] = [];
  const floorItems: SyntheticFloorItem[] = [];
  for (let i = 1; i <= (options.trips ?? 3); i += 1) {
    const id = `TRIP${pad(i, 3)}`;
    trips.push({
      id,
      destination: rng.pick(DESTINATIONS),
      arrival: addDays(baseDate, rng.int(14, 120)),
      teamSize: rng.int(4, 20),
      expectedPatients: rng.int(100, 1500),
      importPermitObtained: rng.chance(0.5),
    });
    const chosen = new Set<string>();
    for (
      let j = 0;
      j < (options.floorItemsPerTrip ?? 8) && chosen.size < catalog.length;
      j += 1
    ) {
      const entry = rng.pick(catalog);
      if (chosen.has(entry.sourceId)) continue;
      chosen.add(entry.sourceId);
      floorItems.push({
        tripId: id,
        catalogSourceId: entry.sourceId,
        genericName: entry.genericName,
        dosageForm: entry.dosageForm,
        strength: entry.strength,
        target: rng.int(20, 300),
        priority: rng.pick([1, 2, 3] as const),
      });
    }
  }
  return { synthetic: true, seed, baseDate, donors, lots, trips, floorItems };
}
