/**
 * The checks of the pre-release confirmation run (DOC-070 §5; DAT-002; TC-034): rules that must
 * hold for every lot and every trip in a set of synthetic Prepped scenarios, whatever the data.
 * Each broken rule is reported with the scenario, trip and lot; nothing stops at the first one,
 * and a rule that throws is reported as a failure. The rules are passed in so the checks can be
 * shown to catch broken ones (TC-034); the run uses core's own.
 */
import {
  assessFloor as coreAssessFloor,
  checkLot as coreCheckLot,
  daysBetween,
  type FloorAssessment,
  type FloorInput,
  type LotEligibility,
  type LotFacts,
  type EligibilityRules,
} from "@church-logistics/core";
import type { PreppedData } from "./prepped.ts";

export interface PreppedRules {
  readonly checkLot: (lot: LotFacts, rules: EligibilityRules) => LotEligibility;
  readonly assessFloor: (input: FloorInput) => FloorAssessment;
}

export interface ConfirmationResult {
  readonly scenarioId: string;
  readonly trips: number;
  /** Lot checks made: every lot against every trip. */
  readonly lotChecks: number;
  readonly failures: readonly string[];
}

const CORE: PreppedRules = {
  checkLot: coreCheckLot,
  assessFloor: coreAssessFloor,
};

const message = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);

/** Runs every check on one scenario; the check date is the scenario's base date. */
export function confirmPrepped(
  scenarioId: string,
  data: PreppedData,
  minimumDaysAtArrival: number,
  rules: PreppedRules = CORE,
): ConfirmationResult {
  const failures: string[] = [];
  let lotChecks = 0;
  const checkDate = data.baseDate;
  for (const trip of data.trips) {
    const where = `${scenarioId} ${trip.id}`;
    const tripRules: EligibilityRules = {
      arrival: trip.arrival,
      checkDate,
      minimumDaysAtArrival,
    };
    const results = new Map<string, LotEligibility>();
    try {
      for (const lot of data.lots) {
        lotChecks += 1;
        const e = rules.checkLot(
          {
            id: lot.id,
            expiry: lot.expiry,
            controlled: lot.controlled,
            controlledBasis: "synthetic catalogue entry",
            coldChain: lot.coldChain,
            inScope: true,
            scopeReason: null,
          },
          tripRules,
        );
        results.set(lot.id, e);
        const say = (problem: string): void => {
          failures.push(`${where} ${lot.id}: ${problem}`);
        };
        const expiry = lot.expiry;
        if (daysBetween(checkDate, expiry) < 0 && e.status !== "discard")
          say("expired but not set aside");
        if (lot.controlled === "yes" && e.status === "eligible")
          say("controlled but eligible");
        if (lot.coldChain && e.status === "eligible")
          say("cold chain but eligible");
        if (
          daysBetween(trip.arrival, expiry) < minimumDaysAtArrival &&
          e.status === "eligible"
        )
          say("short of shelf life at arrival but eligible");
        if (e.status !== "eligible" && e.reasons.length === 0)
          say(`is ${e.status} but has no reason`);
      }
      const items = data.floorItems.filter((f) => f.tripId === trip.id);
      const a = rules.assessFloor({
        floorItems: items.map((f, i) => ({
          id: `${trip.id}-fi-${String(i + 1)}`,
          catalogEntryId: f.catalogSourceId,
          genericName: f.genericName,
          target: f.target,
          priority: f.priority,
        })),
        lots: data.lots.map((lot) => ({
          lotId: lot.id,
          lotNumber: lot.lotNumber,
          donorId: lot.donorId,
          manufacturer: null,
          catalogEntryId: lot.catalogSourceId,
          genericName: lot.genericName,
          dosageForm: lot.dosageForm,
          strength: lot.strength,
          quantity: lot.quantity,
          eligibility: results.get(lot.id) as LotEligibility,
        })),
        acceptedExchanges: [],
        requiredDocuments: [
          {
            id: "import-permit",
            name: "Import permit",
            prepared: trip.importPermitObtained,
            reviewed: trip.importPermitObtained,
          },
        ],
      });
      const blocked =
        a.shortages.length > 0 ||
        a.missingDocuments.length > 0 ||
        a.problems.length > 0;
      if (a.indicator === "Go" && blocked)
        failures.push(`${where}: says Go while something stands in the way`);
      for (const [part, value] of Object.entries(a.meter))
        if (!(value >= 0 && value <= 1))
          failures.push(
            `${where}: meter ${part} outside 0 to 1 (${String(value)})`,
          );
      for (const item of a.items)
        for (const counted of item.lots)
          if (results.get(counted.lotId)?.status !== "eligible")
            failures.push(
              `${where} ${item.floorItemId}: counts lot ${counted.lotId}, which is not eligible`,
            );
    } catch (e) {
      failures.push(`${where}: a rule threw: ${message(e)}`);
    }
  }
  return { scenarioId, trips: data.trips.length, lotChecks, failures };
}

/** The parts of a checked donor-list reading the comparison needs (AIC-101, `checkDonorList`). */
export interface CheckedReading {
  readonly lines: readonly {
    readonly line: number;
    readonly needsReview: boolean;
    readonly genericName: string | null;
    readonly strength: string | null;
    readonly dosageForm: string | null;
    readonly quantity: number | null;
    readonly lotNumber: string | null;
    readonly expiry: string | null;
  }[];
  readonly unread: readonly unknown[];
}

export interface ReadingComparison {
  readonly lines: number;
  /** Accepted by the check and equal to the label in every field. */
  readonly exact: number;
  /** Marked for a person's review by the check. */
  readonly flagged: number;
  /** Given no usable item: the person enters the line by hand. */
  readonly unread: number;
  /** Accepted by the check but with a quantity, lot number or expiry other than the label's: never allowed. */
  readonly silentErrors: readonly string[];
  /**
   * Accepted by the check with a medicine name, strength or form other than the label's. Reported,
   * not failed: a person chooses the catalogue entry for every line before it becomes stock, and
   * that entry supplies these fields (owner, 2026-11-19 and 2026-11-26; OD-068 a).
   */
  readonly differences: readonly string[];
}

/**
 * Compares the AI's checked reading of donor lines with the lots the lines were written from
 * (TC-034). Line n is lot n. In a line the check accepted, a quantity, lot number or expiry
 * other than the label's is a silent error; a name, strength or form other than the label's is a
 * difference, reported for the person's catalogue match (OD-068 a). Text is compared without
 * letter case. A line the check flagged or could not read goes to a person, so it is neither.
 */
export function compareReadings(
  lots: readonly PreppedData["lots"][number][],
  reading: CheckedReading,
): ReadingComparison {
  let exact = 0;
  let flagged = 0;
  const silentErrors: string[] = [];
  const differences: string[] = [];
  for (const r of reading.lines) {
    if (r.needsReview) {
      flagged += 1;
      continue;
    }
    const lot = lots[r.line - 1];
    if (lot === undefined) {
      silentErrors.push(`line ${String(r.line)}: no such line was given`);
      continue;
    }
    // [field, as read, on the label, used by code without a person's choice]
    const fields: [string, unknown, unknown, boolean][] = [
      ["medicine name", r.genericName, lot.genericName, false],
      ["strength", r.strength, lot.strength, false],
      ["dosage form", r.dosageForm, lot.dosageForm, false],
      ["quantity", r.quantity, lot.quantity, true],
      ["lot number", r.lotNumber, lot.lotNumber, true],
      ["expiry", r.expiry, lot.expiry, true],
    ];
    // Text is compared without letter case: the check keeps a value as the line writes it, and
    // a medicine's form can appear in its name too ("Glycerin Suppository ... SUPPOSITORY").
    const same = (read: unknown, label: unknown): boolean =>
      typeof read === "string" && typeof label === "string"
        ? read.toLowerCase() === label.toLowerCase()
        : read === label;
    const wrong = fields.filter(([, read, label]) => !same(read, label));
    if (wrong.length === 0) exact += 1;
    for (const [field, read, label, usedByCode] of wrong)
      (usedByCode ? silentErrors : differences).push(
        `line ${String(r.line)}: ${field} read as ${String(read)}, label says ${String(label)}`,
      );
  }
  return {
    lines: lots.length,
    exact,
    flagged,
    unread: reading.unread.length,
    silentErrors,
    differences,
  };
}
