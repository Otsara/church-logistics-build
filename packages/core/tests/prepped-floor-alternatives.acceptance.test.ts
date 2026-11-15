// A comparable alternative the clinician chooses counts exactly the share of the target they
// enter (OD-055 option b; owner, 2026-11-15; ADR-026). Lots are synthetic.
import { describe, expect, it } from "vitest";
import { parseIsoDate } from "../src/dates.ts";
import { checkLot } from "../src/prepped/eligibility.ts";
import {
  assessFloor,
  type ChosenAlternative,
  type FloorItem,
  type StockLot,
} from "../src/prepped/floor.ts";

const TRIP = {
  arrival: parseIsoDate("2026-12-01"),
  checkDate: parseIsoDate("2026-11-11"),
  minimumDaysAtArrival: 365,
};
const PENICILLIN = "Penicillin-class Antibacterial";

const stock = (
  lotId: string,
  genericName: string,
  quantity: number,
  classes: readonly string[] = [PENICILLIN],
  expiry = "2028-01-15",
): StockLot => ({
  lotId,
  donorId: "D001",
  manufacturer: "Synthetic Maker A",
  catalogEntryId: `E-${genericName}`,
  genericName,
  dosageForm: "CAPSULE",
  strength: "500 mg",
  quantity,
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

const AMOX: FloorItem = {
  id: "F1",
  catalogEntryId: "E-Amoxicillin",
  genericName: "Amoxicillin",
  target: 300,
  priority: 1,
  classes: [PENICILLIN],
};

const assess = (
  lots: readonly StockLot[],
  chosenAlternatives: readonly ChosenAlternative[],
  floorItems: readonly FloorItem[] = [AMOX],
) =>
  assessFloor({
    floorItems,
    lots,
    acceptedExchanges: [],
    requiredDocuments: [],
    chosenAlternatives,
  });

describe("Chosen comparable alternatives", () => {
  it("[TC-134] Given a floor item of 300 with 100 eligible, when the clinician chooses a comparable alternative and enters that it covers 200, then the item is covered and says so; when nothing is entered for it, it does not count", () => {
    const lots = [
      stock("L-AMOX", "Amoxicillin", 100),
      stock("L-AMP", "Ampicillin", 50),
    ];
    const chosen = assess(lots, [
      { floorItemId: "F1", lotId: "L-AMP", covers: 200 },
    ]);
    expect(chosen.items[0]).toMatchObject({
      status: "covered",
      covered: 300,
      short: 0,
      alternativesChosen: [{ lotId: "L-AMP", covers: 200 }],
      reasons: [
        "covered partly by a comparable alternative chosen by the clinician: lot L-AMP (Ampicillin 500 mg capsule), 200",
      ],
    });
    expect(chosen.indicator).toBe("Go");
    // Counted exactly as entered: the ampicillin lot's own quantity (50) plays no part.
    const part = assess(lots, [
      { floorItemId: "F1", lotId: "L-AMP", covers: 120 },
    ]);
    expect(part.items[0]).toMatchObject({
      status: "short",
      covered: 220,
      short: 80,
    });
    // Without a choice, listing an alternative counts nothing (SYS-108).
    expect(assess(lots, []).items[0]).toMatchObject({
      short: 200,
      alternativesChosen: [],
    });
  });

  it("[SYS-108, TC-135] Given a chosen alternative that is the same medicine, shares no class, brings an extra class, or has no valid amount, then the item needs review and it is not counted", () => {
    const lots = [
      stock("L-AMOX", "Amoxicillin", 100),
      stock("L-AMOX2", "amoxicillin", 50),
      stock("L-CIPRO", "Ciprofloxacin", 50, ["Fluoroquinolone Antibacterial"]),
      stock("L-NOCLASS", "Synthetic medicine", 50, []),
      stock("L-AMP", "Ampicillin", 50),
    ];
    const check = (choice: ChosenAlternative, reason: string) => {
      const result = assess(lots, [choice]);
      expect(result.items[0], reason).toMatchObject({
        status: "needs_review",
        covered: 100,
        alternativesChosen: [],
        reasons: [reason],
      });
      expect(result.indicator).toBe("No go");
    };
    check(
      { floorItemId: "F1", lotId: "L-AMOX2", covers: 200 },
      "lot L-AMOX2 (amoxicillin 500 mg capsule) is the same medicine, so it is an exchange, not a comparable alternative: check",
    );
    check(
      { floorItemId: "F1", lotId: "L-CIPRO", covers: 200 },
      "lot L-CIPRO (Ciprofloxacin 500 mg capsule) shares no class with Amoxicillin, so it cannot be a comparable alternative: check",
    );
    check(
      { floorItemId: "F1", lotId: "L-NOCLASS", covers: 200 },
      "lot L-NOCLASS (Synthetic medicine 500 mg capsule) shares no class with Amoxicillin, so it cannot be a comparable alternative: check",
    );
    // A combination adding a class the floor item lacks cannot be a comparable alternative.
    const comboLots = [
      ...lots,
      stock("L-COMBO", "Amoxicillin and Clavulanate Potassium", 50, [
        PENICILLIN,
        "beta Lactamase Inhibitor",
        "Second synthetic class",
      ]),
    ];
    const combo = assess(comboLots, [
      { floorItemId: "F1", lotId: "L-COMBO", covers: 200 },
    ]);
    expect(combo.items[0]).toMatchObject({
      status: "needs_review",
      reasons: [
        "lot L-COMBO (Amoxicillin and Clavulanate Potassium 500 mg capsule) brings a class Amoxicillin does not have (beta Lactamase Inhibitor, Second synthetic class), so it cannot be a comparable alternative: check",
      ],
    });
    for (const covers of [0, -1, Number.NaN]) {
      check(
        { floorItemId: "F1", lotId: "L-AMP", covers },
        "lot L-AMP (Ampicillin 500 mg capsule) has no amount entered: the clinician enters how much of the target it covers",
      );
    }
    // A floor item with no class recorded can have no comparable alternative.
    const noClassItem: FloorItem = {
      id: "F1",
      catalogEntryId: "E-Amoxicillin",
      genericName: "Amoxicillin",
      target: 300,
      priority: 1,
    };
    expect(
      assess(
        lots,
        [{ floorItemId: "F1", lotId: "L-AMP", covers: 200 }],
        [noClassItem],
      ).items[0]?.status,
    ).toBe("needs_review");
  });

  it("[SYS-108] Given a chosen alternative whose lot is missing or no longer eligible, then it is not counted, with the reason; one for an item not on the list means No go", () => {
    const lots = [
      stock("L-AMOX", "Amoxicillin", 100),
      stock("L-OLD", "Ampicillin", 50, [PENICILLIN], "2027-03-01"),
    ];
    const result = assess(lots, [
      { floorItemId: "F1", lotId: "L-OLD", covers: 200 },
      { floorItemId: "F1", lotId: "L-GONE", covers: 200 },
    ]);
    expect(result.items[0]).toMatchObject({
      status: "short",
      covered: 100,
      reasons: [
        "chosen alternative L-OLD is not eligible (blocked): not counted",
        "chosen alternative L-GONE is not in the stock list: not counted",
      ],
    });
    // A lot with no expiry needs review, so a choice of it is not counted either.
    const noExpiryLot: StockLot = {
      ...stock("L-NOEXP", "Ampicillin", 50),
      eligibility: checkLot(
        {
          id: "L-NOEXP",
          expiry: null,
          controlled: "no",
          controlledBasis:
            "FDA drug directory: no DEA schedule recorded (US scheduling only)",
          coldChain: false,
          inScope: true,
          scopeReason: null,
        },
        TRIP,
      ),
    };
    const noExpiry = assess(
      [stock("L-AMOX", "Amoxicillin", 100), noExpiryLot],
      [{ floorItemId: "F1", lotId: "L-NOEXP", covers: 200 }],
    );
    expect(noExpiry.items[0]?.reasons).toEqual([
      "chosen alternative L-NOEXP is not eligible (needs review): not counted",
    ]);
    // A lot recorded with no class information shares no class.
    const full = stock("L-BARE", "Ampicillin", 50);
    const bare: StockLot = {
      lotId: full.lotId,
      donorId: full.donorId,
      manufacturer: full.manufacturer,
      catalogEntryId: full.catalogEntryId,
      genericName: full.genericName,
      dosageForm: full.dosageForm,
      strength: full.strength,
      quantity: full.quantity,
      eligibility: full.eligibility,
    };
    const noClasses = assess(
      [stock("L-AMOX", "Amoxicillin", 100), bare],
      [{ floorItemId: "F1", lotId: "L-BARE", covers: 200 }],
    );
    expect(noClasses.items[0]?.status).toBe("needs_review");
    const stray = assess(lots, [
      { floorItemId: "F9", lotId: "L-OLD", covers: 1 },
    ]);
    expect(stray.problems).toEqual([
      "chosen alternative L-OLD is for F9, which is not on the floor list: check",
    ]);
    expect(stray.indicator).toBe("No go");
  });

  it("[SYS-113] Given a lot chosen as an alternative for one item that is another item's own product, then both need review (ADR-023)", () => {
    const AMP_ITEM: FloorItem = {
      id: "F2",
      catalogEntryId: "E-Ampicillin",
      genericName: "Ampicillin",
      target: 10,
      priority: 2,
      classes: [PENICILLIN],
    };
    const result = assess(
      [stock("L-AMOX", "Amoxicillin", 100), stock("L-AMP", "Ampicillin", 50)],
      [{ floorItemId: "F1", lotId: "L-AMP", covers: 200 }],
      [AMOX, AMP_ITEM],
    );
    expect(result.items.map((i) => i.status)).toEqual([
      "needs_review",
      "needs_review",
    ]);
    expect(result.items[1]?.reasons).toEqual([
      "lot L-AMP would be counted toward two floor items (F1 and F2): the clinician resolves it",
    ]);
  });
});
