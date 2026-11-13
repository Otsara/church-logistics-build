// Prepped floor coverage, Go or No go and the readiness meter: acceptance tests from DOC-070
// (SYS-106, SYS-110, SYS-112 to SYS-115). Every lot, quantity and document is synthetic.
import { describe, expect, it } from "vitest";
import { parseIsoDate } from "../src/dates.ts";
import { checkLot, type LotFacts } from "../src/prepped/eligibility.ts";
import {
  assessFloor,
  INDICATOR_LABEL,
  type AcceptedExchange,
  type FloorItem,
  type RequiredDocument,
  type StockLot,
} from "../src/prepped/floor.ts";

const d = parseIsoDate;
const TRIP = {
  arrival: d("2026-12-01"),
  checkDate: d("2026-11-11"),
  minimumDaysAtArrival: 365,
};

const facts = (id: string, expiry: string | null): LotFacts => ({
  id,
  expiry,
  controlled: "no",
  controlledBasis:
    "FDA drug directory: no DEA schedule recorded (US scheduling only)",
  coldChain: false,
  inScope: true,
  scopeReason: null,
});

/** A lot of a catalogue entry, checked for the trip; long-dated (eligible) unless told otherwise. */
const stock = (
  lotId: string,
  entry: { id: string; name: string; form: string; strength: string },
  quantity: number,
  donorId = "D001",
  expiry: string | null = "2028-01-15",
): StockLot => ({
  lotId,
  donorId,
  catalogEntryId: entry.id,
  genericName: entry.name,
  dosageForm: entry.form,
  strength: entry.strength,
  quantity,
  eligibility: checkLot(facts(lotId, expiry), TRIP),
});

const AMOX_CAP = {
  id: "E-AMOX-CAP-500",
  name: "Amoxicillin",
  form: "CAPSULE",
  strength: "500 mg",
};
const AMOX_SUSP = {
  id: "E-AMOX-SUSP-250",
  name: "Amoxicillin",
  form: "POWDER, FOR SUSPENSION",
  strength: "250 mg/5 mL",
};
const AMOX_CAP_250 = {
  id: "E-AMOX-CAP-250",
  name: "amoxicillin ",
  form: "CAPSULE",
  strength: "250 mg",
};
const ORS = {
  id: "E-ORS",
  name: "Oral rehydration salts",
  form: "POWDER",
  strength: "20.5 g",
};
const PARA = {
  id: "E-PARA-500",
  name: "Paracetamol",
  form: "TABLET",
  strength: "500 mg",
};

const item = (
  id: string,
  entry: { id: string; name: string },
  target: number | null,
  priority: 1 | 2 | 3 = 1,
): FloorItem => ({
  id,
  catalogEntryId: entry.id,
  genericName: entry.name,
  target,
  priority,
});

const PERMIT = (prepared: boolean, reviewed = prepared): RequiredDocument => ({
  id: "DOC-PERMIT",
  name: "Import permit",
  prepared,
  reviewed,
});

const assess = (
  floorItems: readonly FloorItem[],
  lots: readonly StockLot[],
  requiredDocuments: readonly RequiredDocument[] = [],
  acceptedExchanges: readonly AcceptedExchange[] = [],
) => assessFloor({ floorItems, lots, requiredDocuments, acceptedExchanges });

/** A floor list whose second item, ORS, is fully covered. */
const ORS_ITEM = item("F2", ORS, 50);
const ORS_LOT = stock("L-ORS", ORS, 50);

describe("Prepped floor coverage and the Go or No go indicator", () => {
  it("[TC-106] Given a target of 200 courses and 150 eligible, then item coverage is 75%", () => {
    const result = assess(
      [item("F1", AMOX_CAP, 200)],
      [stock("L1", AMOX_CAP, 150)],
    );
    const [f1] = result.items;
    expect(f1).toMatchObject({
      floorItemId: "F1",
      status: "short",
      covered: 150,
      short: 50,
      coverage: 0.75,
    });
  });

  it("[TC-112] Given a floor item with a target of 100 and two eligible lots of the same medicine, strength and form, from different donors, of 60 and 50, then the item is covered and both lots are listed against it", () => {
    const result = assess(
      [item("F1", AMOX_CAP, 100)],
      [stock("L1", AMOX_CAP, 60, "D001"), stock("L2", AMOX_CAP, 50, "D002")],
    );
    expect(result.items[0]).toMatchObject({
      status: "covered",
      covered: 110,
      short: 0,
      coverage: 1,
      lots: [
        { lotId: "L1", donorId: "D001", quantity: 60 },
        { lotId: "L2", donorId: "D002", quantity: 50 },
      ],
    });
    expect(result.indicator).toBe("Go");
  });

  it('[TC-113] Given a floor item with a target of 100 and 70 eligible, and every other floor item covered, then the indicator shows "No go" and lists that item as 30 short', () => {
    const result = assess(
      [item("F1", AMOX_CAP, 100), ORS_ITEM],
      [stock("L1", AMOX_CAP, 70), ORS_LOT],
    );
    expect(result.indicator).toBe("No go");
    expect(result.shortages).toEqual([
      { floorItemId: "F1", genericName: "Amoxicillin", short: 30 },
    ]);
    expect(result.missingDocuments).toEqual([]);
  });

  it('[TC-114] Given every floor item covered, and a destination rule card that requires an import permit not yet prepared, then the indicator shows "No go" and lists the permit', () => {
    const covered = [[ORS_ITEM], [ORS_LOT]] as const;
    const notPrepared = assess(...covered, [PERMIT(false)]);
    expect(notPrepared.indicator).toBe("No go");
    expect(notPrepared.shortages).toEqual([]);
    expect(notPrepared.missingDocuments).toEqual([
      {
        documentId: "DOC-PERMIT",
        name: "Import permit",
        reason: "not prepared",
      },
    ]);
    // Prepared is not enough: it must also be marked reviewed (SYS-112).
    const notReviewed = assess(...covered, [PERMIT(true, false)]);
    expect(notReviewed.indicator).toBe("No go");
    expect(notReviewed.missingDocuments).toEqual([
      {
        documentId: "DOC-PERMIT",
        name: "Import permit",
        reason: "prepared, not yet reviewed",
      },
    ]);
    expect(assess(...covered, [PERMIT(true)]).indicator).toBe("Go");
  });

  it('[TC-115] Given every floor item covered and every required document prepared, when the clinician adds a supplement with no eligible stock, then the indicator still shows "Go"', () => {
    // The supplement's only lot is expired; supplements are never floor items (SYS-114).
    const supplementLot = stock("L-PARA", PARA, 500, "D003", "2026-10-01");
    expect(supplementLot.eligibility.status).toBe("discard");
    const result = assess([ORS_ITEM], [ORS_LOT, supplementLot], [PERMIT(true)]);
    expect(result.indicator).toBe("Go");
    expect(result.items.map((i) => i.floorItemId)).toEqual(["F2"]);
  });

  it("[TC-116] Given any Go or No go result, then the indicator shows \"Indicator only: deploying the team is the lead clinician's or team leader's decision\"", () => {
    expect(INDICATOR_LABEL).toBe(
      "Indicator only: deploying the team is the lead clinician's or team leader's decision",
    );
    expect(assess([ORS_ITEM], [ORS_LOT]).label).toBe(INDICATOR_LABEL);
    expect(assess([ORS_ITEM], []).label).toBe(INDICATOR_LABEL);
  });

  it('[TC-117] Given a floor item with no target quantity entered, then it is "needs review", counts as not covered, and the indicator shows "No go"', () => {
    for (const target of [null, 0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = assess(
        [item("F1", AMOX_CAP, target), ORS_ITEM],
        [stock("L1", AMOX_CAP, 500), ORS_LOT],
      );
      expect(result.items[0], String(target)).toMatchObject({
        status: "needs_review",
        coverage: 0,
        short: null,
        reasons: ["no target quantity entered: the lead clinician sets it"],
      });
      expect(result.indicator).toBe("No go");
      expect(result.shortages).toEqual([
        { floorItemId: "F1", genericName: "Amoxicillin", short: null },
      ]);
    }
  });

  it("[TC-119] Given a floor item for a 500 mg capsule with a target of 100, 40 eligible capsules, and an eligible lot of the same medicine as an oral suspension, then the suspension is offered as an exchange and the item stays 60 short until the clinician accepts the exchange", () => {
    const result = assess(
      [item("F1", AMOX_CAP, 100)],
      [stock("L1", AMOX_CAP, 40), stock("L-SUSP", AMOX_SUSP, 30, "D002")],
    );
    expect(result.items[0]).toMatchObject({
      status: "short",
      covered: 40,
      short: 60,
      exchangesOffered: [
        {
          lotId: "L-SUSP",
          donorId: "D002",
          dosageForm: "POWDER, FOR SUSPENSION",
          strength: "250 mg/5 mL",
          quantity: 30,
        },
      ],
      exchangesAccepted: [],
    });
    // An ineligible lot of the same medicine is never offered.
    const expired = assess(
      [item("F1", AMOX_CAP, 100)],
      [
        stock("L1", AMOX_CAP, 40),
        stock("L-OLD", AMOX_SUSP, 30, "D002", "2026-10-01"),
      ],
    );
    expect(expired.items[0]?.exchangesOffered).toEqual([]);
    // Names are compared ignoring case and surrounding spaces, on either side.
    const spaced = assess(
      [{ ...item("F1", AMOX_CAP, 100), genericName: " AMOXICILLIN  " }],
      [stock("L-SUSP", AMOX_SUSP, 30)],
    );
    expect(spaced.items[0]?.exchangesOffered.map((x) => x.lotId)).toEqual([
      "L-SUSP",
    ]);
  });

  it("[TC-122] Given a floor item with a target of 100 and 40 eligible capsules, when the clinician accepts an oral suspension exchange and enters that it covers 60 of the target, then the item is covered; when the clinician enters 30, the item stays 30 short", () => {
    const floor = [item("F1", AMOX_CAP, 100)];
    const lots = [stock("L1", AMOX_CAP, 40), stock("L-SUSP", AMOX_SUSP, 30)];
    const covers60 = assess(
      floor,
      lots,
      [],
      [{ floorItemId: "F1", lotId: "L-SUSP", covers: 60 }],
    );
    expect(covers60.problems).toEqual([]);
    expect(covers60.indicator).toBe("Go");
    expect(covers60.items[0]).toMatchObject({
      status: "covered",
      covered: 100,
      short: 0,
      exchangesOffered: [],
      exchangesAccepted: [{ lotId: "L-SUSP", covers: 60 }],
    });
    // Counted exactly as entered: the suspension's own quantity (30) plays no part (ADR-011).
    const covers30 = assess(
      floor,
      lots,
      [],
      [{ floorItemId: "F1", lotId: "L-SUSP", covers: 30 }],
    );
    expect(covers30.items[0]).toMatchObject({
      status: "short",
      covered: 70,
      short: 30,
    });
  });

  it("[TC-131] Given a floor item with a target of 100 and 40 eligible tablets, when the clinician accepts an oral suspension covering 30 and another tablet strength covering 30, then the item is covered", () => {
    const result = assess(
      [item("F1", AMOX_CAP, 100)],
      [
        stock("L1", AMOX_CAP, 40),
        stock("L-SUSP", AMOX_SUSP, 30),
        stock("L-250", AMOX_CAP_250, 200),
      ],
      [],
      [
        { floorItemId: "F1", lotId: "L-SUSP", covers: 30 },
        { floorItemId: "F1", lotId: "L-250", covers: 30 },
      ],
    );
    expect(result.items[0]).toMatchObject({
      status: "covered",
      covered: 100,
      exchangesAccepted: [
        { lotId: "L-SUSP", covers: 30 },
        { lotId: "L-250", covers: 30 },
      ],
    });
  });
});

describe("Prepped floor coverage: lots that never count, and inputs that need review", () => {
  it("[SYS-113] Given lots that are blocked, need review or are set for discard, then none counts toward a floor item", () => {
    const result = assess(
      [item("F1", AMOX_CAP, 100)],
      [
        stock("L-SHORT", AMOX_CAP, 100, "D001", "2027-03-01"),
        stock("L-NOEXP", AMOX_CAP, 100, "D001", null),
        stock("L-OLD", AMOX_CAP, 100, "D001", "2026-10-01"),
      ],
    );
    expect(result.items[0]).toMatchObject({
      status: "short",
      covered: 0,
      short: 100,
      lots: [],
    });
  });

  it("[SYS-115] Given an accepted exchange whose lot is no longer eligible, or is missing, then it is not counted and the reason is shown", () => {
    const result = assess(
      [item("F1", AMOX_CAP, 100)],
      [
        stock("L1", AMOX_CAP, 40),
        stock("L-SUSP", AMOX_SUSP, 30, "D001", "2027-03-01"),
        stock("L-NOEXP", AMOX_SUSP, 30, "D001", null),
      ],
      [],
      [
        { floorItemId: "F1", lotId: "L-SUSP", covers: 60 },
        { floorItemId: "F1", lotId: "L-GONE", covers: 60 },
        { floorItemId: "F1", lotId: "L-NOEXP", covers: 60 },
      ],
    );
    expect(result.items[0]).toMatchObject({
      status: "short",
      covered: 40,
      short: 60,
      exchangesAccepted: [],
      reasons: [
        "accepted exchange L-SUSP is not eligible (blocked): not counted",
        "accepted exchange L-GONE is not in the stock list: not counted",
        "accepted exchange L-NOEXP is not eligible (needs review): not counted",
      ],
    });
  });

  it("[SYS-115] Given an accepted exchange that is not the same medicine, is the item's own product, or has no valid covered amount, then the item needs review and the exchange is not counted", () => {
    const lots = [
      stock("L1", AMOX_CAP, 40),
      stock("L-ORS", ORS, 100),
      stock("L-SUSP", AMOX_SUSP, 30),
    ];
    const check = (exchange: AcceptedExchange, reason: string) => {
      const result = assess([item("F1", AMOX_CAP, 100)], lots, [], [exchange]);
      expect(result.items[0], reason).toMatchObject({
        status: "needs_review",
        covered: 40,
        exchangesAccepted: [],
        reasons: [reason],
      });
      expect(result.indicator).toBe("No go");
    };
    check(
      { floorItemId: "F1", lotId: "L-ORS", covers: 60 },
      "accepted exchange L-ORS is not the same medicine: check",
    );
    check(
      { floorItemId: "F1", lotId: "L1", covers: 60 },
      "accepted exchange L1 is the floor item's own product: check",
    );
    for (const covers of [0, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
      check(
        { floorItemId: "F1", lotId: "L-SUSP", covers },
        "accepted exchange L-SUSP has no valid amount covered: the clinician enters it",
      );
    }
  });

  it("[SYS-113] Given a lot that would count toward two floor items, then both items need review and the indicator shows No go", () => {
    // Listed twice on the floor list, the same lots would count twice.
    const twice = assess(
      [item("F1", AMOX_CAP, 50), ORS_ITEM, item("F3", AMOX_CAP, 50)],
      [stock("L1", AMOX_CAP, 60), ORS_LOT],
    );
    // Only the two items sharing the lot need review; the ORS item is untouched.
    expect(twice.items.map((i) => [i.status, i.reasons])).toEqual([
      ["needs_review", ["lot L1 would count toward F1 and F3: check"]],
      ["covered", []],
      ["needs_review", ["lot L1 would count toward F1 and F3: check"]],
    ]);
    expect(twice.indicator).toBe("No go");
    // A lot accepted as an exchange for one item that also counts directly for another.
    const crossed = assess(
      [item("F1", AMOX_CAP, 100), item("F4", AMOX_SUSP, 10)],
      [stock("L1", AMOX_CAP, 40), stock("L-SUSP", AMOX_SUSP, 30)],
      [],
      [{ floorItemId: "F1", lotId: "L-SUSP", covers: 60 }],
    );
    expect(crossed.items.map((i) => i.status)).toEqual([
      "needs_review",
      "needs_review",
    ]);
    expect(crossed.items[1]?.reasons).toEqual([
      "lot L-SUSP would count toward F1 and F4: check",
    ]);
    // An exchange accepted for an item not on the floor list is reported, never counted.
    const stray = assess(
      [ORS_ITEM],
      [ORS_LOT, stock("L-SUSP", AMOX_SUSP, 30)],
      [],
      [{ floorItemId: "F9", lotId: "L-SUSP", covers: 60 }],
    );
    expect(stray.indicator).toBe("No go");
    expect(stray.problems).toEqual([
      "accepted exchange L-SUSP is for F9, which is not on the floor list: check",
    ]);
  });

  it('[SYS-112] Given an empty floor list, then the indicator shows "No go" with the reason, never "Go"', () => {
    const result = assess([], [ORS_LOT]);
    expect(result.indicator).toBe("No go");
    expect(result.problems).toEqual([
      "no floor items chosen: the lead clinician picks the floor list",
    ]);
    expect(result.meter.coverage).toBe(0);
  });
});

describe("Prepped readiness meter", () => {
  it("[SYS-106] Given floor items of priorities 1 to 3 and required documents, then coverage is weighted 3, 2 and 1, and the meter is 70% coverage and 30% documents", () => {
    const result = assess(
      [
        item("F1", AMOX_CAP, 100, 1), // 50% covered, weight 3
        item("F2", ORS, 50, 2), // 100% covered, weight 2
        item("F3", PARA, 10, 3), // 0% covered, weight 1
      ],
      [stock("L1", AMOX_CAP, 50), ORS_LOT],
      [
        PERMIT(true),
        {
          id: "DOC-LETTER",
          name: "Ministry letter",
          prepared: true,
          reviewed: false,
        },
      ],
    );
    // (3 × 0.5 + 2 × 1 + 1 × 0) / 6 = 3.5 / 6
    expect(result.meter.coverage).toBeCloseTo(3.5 / 6, 12);
    expect(result.meter.documents).toBe(0.5);
    expect(result.meter.overall).toBeCloseTo(0.7 * (3.5 / 6) + 0.3 * 0.5, 12);
    // Over-covered items count as 100%, never more; with no documents required, documents are complete.
    const full = assess([ORS_ITEM], [stock("L-ORS", ORS, 500)]);
    expect(full.meter).toEqual({ coverage: 1, documents: 1, overall: 1 });
  });

  it("[SYS-106] Given a needs-review floor item, then it counts as 0% covered in the meter", () => {
    const result = assess(
      [item("F1", AMOX_CAP, null, 1), item("F2", ORS, 50, 3)],
      [stock("L1", AMOX_CAP, 500), ORS_LOT],
    );
    // (3 × 0 + 1 × 1) / 4
    expect(result.meter.coverage).toBe(0.25);
  });
});
