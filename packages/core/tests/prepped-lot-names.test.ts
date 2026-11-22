// Reasons name a lot by the number printed on its label, not by its internal id (TC-144;
// owner, 2026-11-22; REV-018). The internal id stays the key, because two makers can print the
// same lot number and those lots stay separate (ADR-024). Every lot and quantity is synthetic.
import { describe, expect, it } from "vitest";
import { parseIsoDate } from "../src/dates.ts";
import { checkLot } from "../src/prepped/eligibility.ts";
import { assessFloor, lotName, type StockLot } from "../src/prepped/floor.ts";
import { buildPackingList, stockConflicts } from "../src/prepped/packing.ts";

const TRIP = {
  arrival: parseIsoDate("2026-12-01"),
  checkDate: parseIsoDate("2026-11-11"),
  minimumDaysAtArrival: 365,
};

const lot = (
  lotId: string,
  lotNumber: string | null | undefined,
  genericName: string,
  quantity: number,
  classes: readonly string[],
): StockLot => ({
  lotId,
  ...(lotNumber === undefined ? {} : { lotNumber }),
  donorId: "D001",
  manufacturer: "Synthetic Maker E",
  catalogEntryId: `E-${genericName}`,
  genericName,
  dosageForm: "CAPSULE",
  strength: "500 mg",
  quantity,
  eligibility: checkLot(
    {
      id: lotId,
      expiry: "2028-09-30",
      controlled: "no",
      controlledBasis: "FDA drug directory: no DEA schedule recorded",
      coldChain: false,
      inScope: true,
      scopeReason: null,
    },
    TRIP,
  ),
  classes,
});

describe("Lots named by their printed number", () => {
  it("[TC-144] Given a lot with a printed lot number, then its name is that number; with none or a blank one, its id", () => {
    expect(lotName({ lotId: "lot-7", lotNumber: "AMP8820" })).toBe("AMP8820");
    expect(lotName({ lotId: "lot-7", lotNumber: null })).toBe("lot-7");
    expect(lotName({ lotId: "lot-7", lotNumber: "  " })).toBe("lot-7");
    expect(lotName({ lotId: "lot-7" })).toBe("lot-7");
  });

  it("[TC-144] Given a comparable alternative chosen beyond what its lot holds, then the reason names the lot by its printed number", () => {
    const ampicillin = lot("lot-7", "AMP8820", "Ampicillin", 200, [
      "Penicillin-class",
    ]);
    const result = assessFloor({
      floorItems: [
        {
          id: "F1",
          catalogEntryId: "E-Amoxicillin",
          genericName: "Amoxicillin",
          target: 400,
          priority: 1,
          classes: ["Penicillin-class"],
        },
      ],
      lots: [ampicillin],
      acceptedExchanges: [],
      requiredDocuments: [],
      chosenAlternatives: [{ floorItemId: "F1", lotId: "lot-7", covers: 400 }],
    });
    expect(result.items[0]?.reasons).toContain(
      "lot AMP8820 (Ampicillin 500 mg capsule) holds 200 but 400 is entered as covering Amoxicillin: review; find further donations, or the lead clinician redefines the floor",
    );
  });

  it("[TC-144] Given a lot counted toward two floor items, then the reason names it by its printed number", () => {
    const amox = lot("lot-1", "AMX4410", "Amoxicillin", 500, []);
    const result = assessFloor({
      floorItems: [
        {
          id: "F1",
          catalogEntryId: "E-Amoxicillin",
          genericName: "Amoxicillin",
          target: 100,
          priority: 1,
        },
        {
          id: "F2",
          catalogEntryId: "E-Amoxicillin",
          genericName: "Amoxicillin",
          target: 100,
          priority: 2,
        },
      ],
      lots: [amox],
      acceptedExchanges: [],
      requiredDocuments: [],
      chosenAlternatives: [],
    });
    expect(result.items[0]?.reasons).toContain(
      "lot AMX4410 would be counted toward two floor items (F1 and F2): the clinician resolves it",
    );
  });

  it("[TC-144] Given signed-off lists that overdraw a lot, then the conflict names it by its printed number", () => {
    const held = [{ lotId: "lot-1", lotNumber: "AMX4410", quantity: 100 }];
    const lists = [
      { tripId: "TRIP-A", lines: [{ lotId: "lot-1", quantity: 80 }] },
      { tripId: "TRIP-B", lines: [{ lotId: "lot-1", quantity: 80 }] },
    ];
    expect(stockConflicts(held, lists)[0]?.message).toBe(
      "Conflict: check: lot AMX4410 holds 100, but the signed-off packing lists of TRIP-A and TRIP-B take 160; a person resolves it",
    );
  });

  it("[TC-144] Given a comparable alternative within what its lot holds, then the reason names it by its printed number; a lot not in stock is named by its id", () => {
    const ampicillin = lot("lot-7", "AMP8820", "Ampicillin", 200, [
      "Penicillin-class",
    ]);
    const result = assessFloor({
      floorItems: [
        {
          id: "F1",
          catalogEntryId: "E-Amoxicillin",
          genericName: "Amoxicillin",
          target: 400,
          priority: 1,
          classes: ["Penicillin-class"],
        },
      ],
      lots: [ampicillin],
      acceptedExchanges: [{ floorItemId: "F1", lotId: "lot-99", covers: 10 }],
      requiredDocuments: [],
      chosenAlternatives: [{ floorItemId: "F1", lotId: "lot-7", covers: 198 }],
    });
    expect(result.items[0]?.reasons).toContain(
      "covered partly by a comparable alternative chosen by the clinician: lot AMP8820 (Ampicillin 500 mg capsule), 198",
    );
    expect(result.items[0]?.reasons).toContain(
      "accepted exchange lot-99 is not in the stock list: not counted",
    );
  });

  it("[TC-144] Given packing problems, then a lot in stock is named by its printed number and a lot not in stock by its id", () => {
    const amox = lot("lot-1", "AMX4410", "Amoxicillin", 50, []);
    const assessment = assessFloor({
      floorItems: [
        {
          id: "F1",
          catalogEntryId: "E-Amoxicillin",
          genericName: "Amoxicillin",
          target: 40,
          priority: 1,
        },
      ],
      lots: [amox],
      acceptedExchanges: [],
      requiredDocuments: [],
      chosenAlternatives: [],
    });
    const list = buildPackingList({
      assessment,
      lots: [amox],
      packAmounts: [],
      supplements: [
        { lotId: "lot-1", quantity: 60 },
        { lotId: "lot-99", quantity: 5 },
      ],
      adjustments: [],
    });
    expect(list.problems).toEqual([
      "lot AMX4410: 60 for supplement is not a whole number from 1 to 50",
      "supplement lot lot-99 is not in stock",
    ]);
  });
});
