// Comparable alternatives for a short floor item (SYS-108, ADR-003): offered for the clinician
// to consider, never substituted or counted. Classes are FDA established pharmacologic classes
// (EPC; ADR-014). Medicine names and classes are real FDA directory values; lots are synthetic.
import { describe, expect, it } from "vitest";
import { parseIsoDate } from "../src/dates.ts";
import { checkLot } from "../src/prepped/eligibility.ts";
import {
  alternativesForFloor,
  CLASS_SOURCE,
  COMPARABLE_LABEL,
  comparableAlternatives,
  type ClassedLot,
} from "../src/prepped/alternatives.ts";
import { assessFloor } from "../src/prepped/floor.ts";

const TRIP = {
  arrival: parseIsoDate("2026-12-01"),
  checkDate: parseIsoDate("2026-11-11"),
  minimumDaysAtArrival: 365,
};

const lot = (
  lotId: string,
  genericName: string,
  classes: readonly string[],
  expiry = "2028-01-15",
  catalogEntryId = `E-${genericName}`,
): ClassedLot => ({
  lotId,
  donorId: "D001",
  manufacturer: "Synthetic Maker A",
  catalogEntryId,
  genericName,
  dosageForm: "CAPSULE",
  strength: "500 mg",
  quantity: 100,
  classes,
  eligibility: checkLot(
    {
      id: lotId,
      expiry,
      controlled: "no",
      controlledBasis:
        "FDA drug directory: no DEA schedule recorded (US scheduling only)",
      coldChain: false,
      inScope: true,
      scopeReason: null,
    },
    TRIP,
  ),
});

const PENICILLIN = "Penicillin-class Antibacterial";
const AMOX_ITEM = {
  id: "F1",
  catalogEntryId: "E-Amoxicillin",
  genericName: "Amoxicillin",
  classes: [PENICILLIN],
};

describe("Comparable alternatives", () => {
  it('[TC-125] Given a floor item that is short and eligible lots of another medicine in the same class, then those lots are listed as "Comparable, not equivalent: clinician review required" with their class and its source, and none is added until the clinician chooses it', () => {
    expect(COMPARABLE_LABEL).toBe(
      "Comparable, not equivalent: clinician review required",
    );
    expect(CLASS_SOURCE).toBe(
      "FDA drug directory: established pharmacologic class (EPC)",
    );
    const ampicillin = lot("L-AMP", "Ampicillin", [PENICILLIN]);
    const lots = [
      lot("L-AMOX", "Amoxicillin", [PENICILLIN]),
      ampicillin,
      lot("L-CIPRO", "Ciprofloxacin", ["Fluoroquinolone Antibacterial"]),
      lot("L-OLD", "Dicloxacillin", [PENICILLIN], "2026-10-01"),
    ];
    expect(comparableAlternatives(AMOX_ITEM, lots)).toEqual({
      floorItemId: "F1",
      alternatives: [
        {
          lotId: "L-AMP",
          donorId: "D001",
          manufacturer: "Synthetic Maker A",
          genericName: "Ampicillin",
          strength: "500 mg",
          dosageForm: "CAPSULE",
          quantity: 100,
          sharedClasses: [PENICILLIN],
          label: COMPARABLE_LABEL,
          classSource: CLASS_SOURCE,
        },
      ],
      note: null,
    });
    // Nothing is added by listing it: the floor item stays as short as before.
    const floor = {
      floorItems: [
        {
          id: "F1",
          catalogEntryId: "E-Amoxicillin",
          genericName: "Amoxicillin",
          target: 300,
          priority: 1 as const,
        },
      ],
      lots,
      acceptedExchanges: [],
      requiredDocuments: [],
    };
    expect(assessFloor(floor).items[0]).toMatchObject({
      status: "short",
      covered: 100,
      short: 200,
    });
  });

  it("[SYS-108] Given a floor item with no class recorded in the FDA directory, then no alternatives are offered and the screen says why", () => {
    expect(
      comparableAlternatives({ ...AMOX_ITEM, classes: [] }, [
        lot("L-AMP", "Ampicillin", [PENICILLIN]),
      ]),
    ).toEqual({
      floorItemId: "F1",
      alternatives: [],
      note: "no established pharmacologic class recorded in the FDA drug directory: no comparable alternatives can be offered",
    });
  });

  it("[SYS-108] Given a class but no eligible lot of another medicine in it, then the list is empty and says so", () => {
    expect(
      comparableAlternatives(AMOX_ITEM, [
        lot(
          "L-AMOX2",
          " amoxicillin ",
          [PENICILLIN],
          "2028-01-15",
          "E-Amoxicillin-250",
        ),
        lot("L-NONE", "Ibuprofen", []),
      ]),
    ).toEqual({
      floorItemId: "F1",
      alternatives: [],
      note: `no eligible lot of another medicine in the same class (${PENICILLIN})`,
    });
  });

  it("[SYS-108] Given a floor item named with stray spaces and two classes, then its own medicine is still not offered and both classes are named", () => {
    const item = {
      ...AMOX_ITEM,
      genericName: " Amoxicillin ",
      classes: [PENICILLIN, "Second class"],
    };
    expect(
      comparableAlternatives(item, [
        lot("L-AMOX2", "Amoxicillin", [PENICILLIN]),
      ]),
    ).toEqual({
      floorItemId: "F1",
      alternatives: [],
      note: `no eligible lot of another medicine in the same class (${PENICILLIN}, Second class)`,
    });
  });
});

describe("Alternatives bring no class the floor item lacks (owner, 2026-11-15)", () => {
  it("[TC-135] Given a single-agent floor item, then a combination product sharing its class but adding another is not offered; a lot whose classes all belong to the item is", () => {
    const HCTZ = {
      id: "F7",
      catalogEntryId: "E-Hydrochlorothiazide",
      genericName: "Hydrochlorothiazide",
      classes: ["Thiazide Diuretic"],
    };
    const result = comparableAlternatives(HCTZ, [
      lot("L-COMBO", "Losartan and hydrochlorothiazide", [
        "Angiotensin 2 Receptor Blocker",
        "Thiazide Diuretic",
      ]),
      lot("L-CHLOR", "Chlorothiazide", ["Thiazide Diuretic"]),
    ]);
    expect(result.alternatives.map((a) => a.lotId)).toEqual(["L-CHLOR"]);
    // A combination floor item can be offered a single agent whose class it contains.
    const coAmox = {
      id: "F8",
      catalogEntryId: "E-AmoxClav",
      genericName: "Amoxicillin and Clavulanate Potassium",
      classes: [PENICILLIN, "beta Lactamase Inhibitor"],
    };
    expect(
      comparableAlternatives(coAmox, [
        lot("L-AMOX", "Amoxicillin", [PENICILLIN]),
      ]).alternatives.map((a) => a.sharedClasses),
    ).toEqual([[PENICILLIN]]);
  });
});

describe("Alternatives offered when a floor item is short", () => {
  it("[TC-135] Given a floor assessment, then every item's alternatives are listed and those of a short or needs-review item are marked as offered because it is short", () => {
    const ampicillin = lot("L-AMP", "Ampicillin", [PENICILLIN]);
    const amoxLot = lot("L-AMOX", "Amoxicillin", [PENICILLIN]);
    const floorItems = [
      {
        id: "F1",
        catalogEntryId: "E-Amoxicillin",
        genericName: "Amoxicillin",
        target: 300,
        priority: 1 as const,
        classes: [PENICILLIN],
      },
      {
        id: "F2",
        catalogEntryId: "E-Amoxicillin",
        genericName: "Amoxicillin",
        target: 50,
        priority: 2 as const,
        classes: [PENICILLIN],
      },
    ];
    const one = assessFloor({
      floorItems: [floorItems[0] as (typeof floorItems)[number]],
      lots: [amoxLot, ampicillin],
      acceptedExchanges: [],
      requiredDocuments: [],
    });
    const listed = alternativesForFloor(
      [AMOX_ITEM],
      [amoxLot, ampicillin],
      one,
    );
    expect(listed).toEqual([
      {
        ...comparableAlternatives(AMOX_ITEM, [amoxLot, ampicillin]),
        offered: true,
      },
    ]);
    const covered = assessFloor({
      floorItems: [
        { ...(floorItems[1] as (typeof floorItems)[number]), id: "F1" },
      ],
      lots: [amoxLot, ampicillin],
      acceptedExchanges: [],
      requiredDocuments: [],
    });
    expect(
      alternativesForFloor([AMOX_ITEM], [amoxLot, ampicillin], covered)[0]
        ?.offered,
    ).toBe(false);
    // With two items, each is marked by its own coverage.
    const both = assessFloor({
      floorItems: [
        { ...(floorItems[1] as (typeof floorItems)[number]), id: "F1" },
        {
          ...(floorItems[0] as (typeof floorItems)[number]),
          id: "F2",
          catalogEntryId: "E-Cefalexin",
          genericName: "Cefalexin",
        },
      ],
      lots: [amoxLot, ampicillin],
      acceptedExchanges: [],
      requiredDocuments: [],
    });
    expect(
      alternativesForFloor(
        [AMOX_ITEM, { ...AMOX_ITEM, id: "F2" }],
        [ampicillin],
        both,
      ).map((r) => r.offered),
    ).toEqual([false, true]);
    // An item missing from the assessment is not marked as offered.
    expect(
      alternativesForFloor(
        [{ ...AMOX_ITEM, id: "F9" }],
        [amoxLot, ampicillin],
        covered,
      )[0]?.offered,
    ).toBe(false);
  });
});
