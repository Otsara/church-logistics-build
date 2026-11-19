// The packing list (SYS-121; TC-140, TC-141, TC-142): built by core from the floor assessment and the
// team's stock, soonest expiry first, packing only what is needed, so the rest of a lot stays in
// stock for another brigade; exchanges, alternatives and supplements packed at the amounts the lead
// clinician enters; any line's amount changeable by the lead clinician (owner, 2026-11-18; REV-014,
// ADR-049). Every lot and quantity is synthetic.
import { describe, expect, it } from "vitest";
import { parseIsoDate } from "../src/dates.ts";
import { checkLot, type LotFacts } from "../src/prepped/eligibility.ts";
import {
  assessFloor,
  type FloorItem,
  type StockLot,
} from "../src/prepped/floor.ts";
import {
  availableStock,
  buildPackingList,
  stockConflicts,
  type PackingInput,
} from "../src/prepped/packing.ts";
import {
  SIGNING_ROLE,
  packingListStatus,
  signOffPackingList,
} from "../src/prepped/sign-off.ts";

const d = parseIsoDate;
const TRIP = {
  arrival: d("2026-12-01"),
  checkDate: d("2026-11-11"),
  minimumDaysAtArrival: 365,
};

const facts = (
  id: string,
  expiry: string | null,
  controlled: "no" | "yes" = "no",
): LotFacts => ({
  id,
  expiry,
  controlled,
  controlledBasis:
    "FDA drug directory: no DEA schedule recorded (US scheduling only)",
  coldChain: false,
  inScope: true,
  scopeReason: null,
});

const AMOX = {
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
const CEPH = {
  id: "E-CEPH-CAP-500",
  name: "Cefalexin",
  form: "CAPSULE",
  strength: "500 mg",
};
const ZINC = {
  id: "E-ZINC-TAB-20",
  name: "Zinc",
  form: "TABLET",
  strength: "20 mg",
};

const stock = (
  lotId: string,
  entry: { id: string; name: string; form: string; strength: string },
  quantity: number,
  expiry = "2028-01-15",
  controlled: "no" | "yes" = "no",
  classes?: readonly string[],
): StockLot => ({
  lotId,
  donorId: "D001",
  manufacturer: "Synthetic Maker A",
  catalogEntryId: entry.id,
  genericName: entry.name,
  dosageForm: entry.form,
  strength: entry.strength,
  quantity,
  eligibility: checkLot(facts(lotId, expiry, controlled), TRIP),
  ...(classes === undefined ? {} : { classes }),
});

const item = (
  target: number | null,
  extra: Partial<FloorItem> = {},
): FloorItem => ({
  id: "F1",
  catalogEntryId: AMOX.id,
  genericName: "Amoxicillin",
  target,
  priority: 1,
  ...extra,
});

const SOON = stock("L-SOON", AMOX, 200, "2028-01-15");
const LATE = stock("L-LATE", AMOX, 700, "2029-06-30");
const MIDDLE = stock("L-MID", AMOX, 50, "2028-08-31");

const pack = (
  lots: readonly StockLot[],
  floorItems: readonly FloorItem[],
  extra: Partial<Omit<PackingInput, "assessment" | "lots">> & {
    acceptedExchanges?: Parameters<typeof assessFloor>[0]["acceptedExchanges"];
    chosenAlternatives?: Parameters<
      typeof assessFloor
    >[0]["chosenAlternatives"];
  } = {},
) => {
  const assessment = assessFloor({
    floorItems,
    lots,
    acceptedExchanges: extra.acceptedExchanges ?? [],
    requiredDocuments: [],
    ...(extra.chosenAlternatives === undefined
      ? {}
      : { chosenAlternatives: extra.chosenAlternatives }),
  });
  return buildPackingList({
    assessment,
    lots,
    packAmounts: extra.packAmounts ?? [],
    supplements: extra.supplements ?? [],
    adjustments: extra.adjustments ?? [],
  });
};

describe("Building the packing list (SYS-121)", () => {
  it("[TC-140] Given more eligible stock than the target, then lots are packed soonest expiry first, the last only in part, and what is left of each lot is shown", () => {
    expect(pack([LATE, SOON, MIDDLE], [item(300)])).toEqual({
      lines: [
        {
          lotId: "L-SOON",
          quantity: 200,
          kind: "floor item",
          floorItemId: "F1",
          for: "floor item Amoxicillin (F1)",
          remains: 0,
          adjusted: false,
        },
        {
          lotId: "L-MID",
          quantity: 50,
          kind: "floor item",
          floorItemId: "F1",
          for: "floor item Amoxicillin (F1)",
          remains: 0,
          adjusted: false,
        },
        {
          lotId: "L-LATE",
          quantity: 50,
          kind: "floor item",
          floorItemId: "F1",
          for: "floor item Amoxicillin (F1)",
          remains: 650,
          adjusted: false,
        },
      ],
      problems: [],
    });
    // A short item packs everything eligible; the shortage is shown on readiness, not here.
    expect(pack([SOON], [item(300)]).lines.map((l) => l.quantity)).toEqual([
      200,
    ]);
    // A confirmed target of 0 packs nothing and raises nothing.
    expect(pack([SOON], [item(0, { zeroTargetConfirmed: true })])).toEqual({
      lines: [],
      problems: [],
    });
  });

  it("[TC-140] Given a floor item with no target, then nothing is packed for it, and the packing list says why", () => {
    expect(pack([SOON], [item(null)])).toEqual({
      lines: [],
      problems: [
        "Amoxicillin (F1) has no target: nothing is packed for it until the lead clinician sets one",
      ],
    });
  });

  it("[TC-140] Given an accepted exchange, then it is packed only at the amount the lead clinician enters, and the item's own medicine covers the rest of the target", () => {
    const SUSP = stock("L-SUSP", AMOX_SUSP, 400, "2028-03-31");
    const exchange = { floorItemId: "F1", lotId: "L-SUSP", covers: 100 };
    const missing = pack([SOON, SUSP], [item(300)], {
      acceptedExchanges: [exchange],
    });
    expect(missing.lines.map((l) => [l.lotId, l.quantity])).toEqual([
      ["L-SOON", 200],
    ]);
    expect(missing.problems).toEqual([
      "exchange lot L-SUSP for Amoxicillin (F1): the lead clinician enters the amount to pack",
    ]);
    const entered = pack([SOON, SUSP], [item(300)], {
      acceptedExchanges: [exchange],
      packAmounts: [{ floorItemId: "F1", lotId: "L-SUSP", quantity: 12 }],
    });
    expect(entered).toEqual({
      lines: [
        {
          lotId: "L-SOON",
          quantity: 200,
          kind: "floor item",
          floorItemId: "F1",
          for: "floor item Amoxicillin (F1)",
          remains: 0,
          adjusted: false,
        },
        {
          lotId: "L-SUSP",
          quantity: 12,
          kind: "exchange",
          floorItemId: "F1",
          for: "exchange for Amoxicillin (F1)",
          remains: 388,
          adjusted: false,
        },
      ],
      problems: [],
    });
  });

  it("[TC-140] Given a chosen alternative, then it is packed only at the amount the lead clinician enters", () => {
    const CLASS = ["Cephalosporin Antibacterial [EPC]"];
    const ceph = stock("L-CEPH", CEPH, 90, "2028-05-31", "no", CLASS);
    const alternative = { floorItemId: "F1", lotId: "L-CEPH", covers: 50 };
    const floorItem = item(250, { classes: CLASS });
    expect(
      pack([SOON, ceph], [floorItem], { chosenAlternatives: [alternative] })
        .problems,
    ).toEqual([
      "alternative lot L-CEPH for Amoxicillin (F1): the lead clinician enters the amount to pack",
    ]);
    const entered = pack([SOON, ceph], [floorItem], {
      chosenAlternatives: [alternative],
      packAmounts: [{ floorItemId: "F1", lotId: "L-CEPH", quantity: 30 }],
    });
    expect(entered.problems).toEqual([]);
    expect(
      entered.lines.map((l) => [l.lotId, l.quantity, l.kind, l.remains]),
    ).toEqual([
      ["L-SOON", 200, "floor item", 0],
      ["L-CEPH", 30, "alternative", 60],
    ]);
  });

  it("[TC-140] Given an amount entered for a lot that is no accepted exchange or chosen alternative, then the packing list says so", () => {
    expect(
      pack([SOON], [item(100)], {
        packAmounts: [{ floorItemId: "F1", lotId: "L-NONE", quantity: 5 }],
      }).problems,
    ).toEqual([
      "an amount is entered for lot L-NONE for F1, but it is not an accepted exchange or a chosen alternative: check",
    ]);
  });

  it("[TC-140] Given the lead clinician changes a line's amount, then the line uses it and is marked as changed; an amount out of range, or for a lot not of that medicine, is refused", () => {
    const changed = pack([LATE, SOON], [item(300)], {
      adjustments: [{ floorItemId: "F1", lotId: "L-LATE", quantity: 250 }],
    });
    expect(changed.problems).toEqual([]);
    expect(
      changed.lines.map((l) => [l.lotId, l.quantity, l.remains, l.adjusted]),
    ).toEqual([
      ["L-SOON", 200, 0, false],
      ["L-LATE", 250, 450, true],
    ]);
    // A lot the soonest-expiry rule left out can be chosen too.
    const chosen = pack([LATE, SOON], [item(100)], {
      adjustments: [{ floorItemId: "F1", lotId: "L-LATE", quantity: 100 }],
    });
    expect(chosen.lines.map((l) => [l.lotId, l.quantity])).toEqual([
      ["L-SOON", 100],
      ["L-LATE", 100],
    ]);
    for (const quantity of [0, 701, 2.5]) {
      expect(
        pack([LATE], [item(300)], {
          adjustments: [{ floorItemId: "F1", lotId: "L-LATE", quantity }],
        }).problems,
        String(quantity),
      ).toEqual([
        `lot L-LATE: ${String(quantity)} for floor item Amoxicillin (F1) is not a whole number from 1 to 700`,
      ]);
    }
    expect(
      pack([LATE], [item(300)], {
        adjustments: [{ floorItemId: "F1", lotId: "L-CEPH", quantity: 5 }],
      }).problems,
    ).toEqual([
      "lot L-CEPH is not a lot of Amoxicillin (F1): its amount cannot be changed there",
    ]);
  });

  it("[TC-140] Given supplements, then each eligible lot is packed at the amount entered; a lot not in stock, not eligible or with a wrong amount is refused", () => {
    const zinc = stock("L-ZINC", ZINC, 20);
    const blocked = stock("L-CTRL", ZINC, 10, "2028-01-15", "yes");
    const result = pack([SOON, zinc, blocked], [item(100)], {
      supplements: [
        { lotId: "L-ZINC", quantity: 15 },
        { lotId: "L-NOPE", quantity: 1 },
        { lotId: "L-CTRL", quantity: 1 },
        { lotId: "L-ZINC", quantity: 0 },
      ],
    });
    expect(
      result.lines.map((l) => [l.lotId, l.quantity, l.kind, l.for, l.remains]),
    ).toEqual([
      ["L-SOON", 100, "floor item", "floor item Amoxicillin (F1)", 100],
      ["L-ZINC", 15, "supplement", "supplement", 5],
    ]);
    expect(result.problems).toEqual([
      "supplement lot L-NOPE is not in stock",
      "supplement lot L-CTRL is not eligible (blocked): not packed",
      "lot L-ZINC: 0 for supplement is not a whole number from 1 to 20",
    ]);
  });

  it("[TC-140] Given lines that together take more of a lot than remains, then the packing list says so", () => {
    expect(
      pack([SOON], [item(150)], {
        supplements: [{ lotId: "L-SOON", quantity: 100 }],
      }).problems,
    ).toEqual([
      "lot L-SOON: the packing list takes 250, but 200 remain in stock: check",
    ]);
  });

  it("[TC-140, SYS-010] Given a packing list with open problems, then it cannot be signed off", () => {
    const list = pack([SOON], [item(null)]);
    expect(
      signOffPackingList({
        lines: [{ lotId: "L-SOON", quantity: 1 }],
        problems: list.problems,
        role: SIGNING_ROLE,
        personId: "PER-1",
        time: "2026-11-18T15:00:00Z",
      }),
    ).toEqual({
      ok: false,
      reason:
        "the packing list has open problems: resolve them before signing off",
    });
  });

  it("[TC-140] Given lots with the same expiry, an exchange amount beyond its lot, or a floor assessment made with stock the list is not given, then the order is by lot id and the packing list says what is wrong", () => {
    const twin = stock("L-A", AMOX, 100, "2028-01-15");
    expect(
      pack([SOON, twin], [item(250)]).lines.map((l) => [l.lotId, l.quantity]),
    ).toEqual([
      ["L-A", 100],
      ["L-SOON", 150],
    ]);
    const SUSP = stock("L-SUSP", AMOX_SUSP, 400, "2028-03-31");
    expect(
      pack([SOON, SUSP], [item(300)], {
        acceptedExchanges: [
          { floorItemId: "F1", lotId: "L-SUSP", covers: 100 },
        ],
        packAmounts: [{ floorItemId: "F1", lotId: "L-SUSP", quantity: 401 }],
      }).problems,
    ).toEqual([
      "lot L-SUSP: 401 for exchange for Amoxicillin (F1) is not a whole number from 1 to 400",
    ]);
    // Made with L-SOON and L-LATE, but given only L-LATE: L-SOON has nothing in stock here.
    const assessment = assessFloor({
      floorItems: [item(300)],
      lots: [SOON, LATE],
      acceptedExchanges: [],
      requiredDocuments: [],
    });
    const list = buildPackingList({
      assessment,
      lots: [LATE],
      packAmounts: [],
      supplements: [],
      adjustments: [],
    });
    expect(list.lines.map((l) => [l.lotId, l.quantity, l.remains])).toEqual([
      ["L-LATE", 300, 400],
    ]);
    expect(list.problems).toEqual([
      "lot L-SOON is in the floor assessment but not in the stock given: the assessment is out of date: check",
    ]);
    const exchanged = assessFloor({
      floorItems: [item(300)],
      lots: [SOON, SUSP],
      acceptedExchanges: [{ floorItemId: "F1", lotId: "L-SUSP", covers: 100 }],
      requiredDocuments: [],
    });
    expect(
      buildPackingList({
        assessment: exchanged,
        lots: [SOON],
        packAmounts: [],
        supplements: [],
        adjustments: [],
      }).problems,
    ).toEqual([
      "lot L-SUSP is in the floor assessment but not in the stock given: the assessment is out of date: check",
    ]);
  });

  it("[TC-140] Given amounts at the edges, exchanges with more own stock than needed, amounts and changes for the wrong item, and a supplement needing review, then each is handled exactly", () => {
    // 1 and the whole lot are both allowed.
    for (const quantity of [1, 700]) {
      expect(
        pack([LATE], [item(300)], {
          adjustments: [{ floorItemId: "F1", lotId: "L-LATE", quantity }],
        }).lines.map((l) => l.quantity),
        String(quantity),
      ).toEqual([quantity]);
    }
    // The exchange covers 100 of 300, so the own medicine takes only 200, soonest expiry first.
    const SUSP = stock("L-SUSP", AMOX_SUSP, 400, "2028-03-31");
    const exchange = { floorItemId: "F1", lotId: "L-SUSP", covers: 100 };
    expect(
      pack([LATE, SOON, SUSP], [item(300)], {
        acceptedExchanges: [exchange],
        packAmounts: [{ floorItemId: "F1", lotId: "L-SUSP", quantity: 12 }],
      }).lines.map((l) => [l.lotId, l.quantity]),
    ).toEqual([
      ["L-SOON", 200],
      ["L-SUSP", 12],
    ]);
    // An amount entered for another item does not count for this one.
    expect(
      pack([SOON, SUSP], [item(300)], {
        acceptedExchanges: [exchange],
        packAmounts: [{ floorItemId: "F2", lotId: "L-SUSP", quantity: 12 }],
      }).problems,
    ).toEqual([
      "exchange lot L-SUSP for Amoxicillin (F1): the lead clinician enters the amount to pack",
      "an amount is entered for lot L-SUSP for F2, but it is not an accepted exchange or a chosen alternative: check",
    ]);
    // A change entered for an item not on the floor list is refused, not applied elsewhere.
    expect(
      pack([LATE], [item(300)], {
        adjustments: [{ floorItemId: "F2", lotId: "L-LATE", quantity: 10 }],
      }),
    ).toMatchObject({
      lines: [{ lotId: "L-LATE", quantity: 300, adjusted: false }],
      problems: [
        "an amount change is entered for lot L-LATE for F2, which is not on the floor list: check",
      ],
    });
    // A supplement lot that needs review is not packed, and an eligible one is never marked as changed.
    const unread = stock("L-NOEXP", ZINC, 10, "");
    const zinc = stock("L-ZINC", ZINC, 20);
    const result = pack([SOON, unread, zinc], [item(1)], {
      supplements: [
        { lotId: "L-NOEXP", quantity: 1 },
        { lotId: "L-ZINC", quantity: 2 },
      ],
    });
    expect(result.problems).toEqual([
      "supplement lot L-NOEXP is not eligible (needs review): not packed",
    ]);
    expect(result.lines.find((l) => l.lotId === "L-ZINC")?.adjusted).toBe(
      false,
    );
  });
});

describe("Stock shared across brigades (SYS-121)", () => {
  it("[TC-141] Given another trip's signed-off packing list takes part of a lot, then only the rest is available to this trip, and a 700 lot covering a target of 300 leaves 400 for the next brigade", () => {
    const first = pack([LATE], [item(300)]);
    expect(first.lines.map((l) => [l.lotId, l.quantity, l.remains])).toEqual([
      ["L-LATE", 300, 400],
    ]);
    const available = availableStock(
      [LATE, SOON],
      [{ tripId: "TRIP-A", lines: first.lines }],
    );
    expect(available.map((l) => [l.lotId, l.quantity])).toEqual([
      ["L-LATE", 400],
      ["L-SOON", 200],
    ]);
    // Nothing else about the lot changes.
    expect(available[0]).toEqual({ ...LATE, quantity: 400 });
    const second = pack(available, [item(500)]);
    expect(second.lines.map((l) => [l.lotId, l.quantity, l.remains])).toEqual([
      ["L-SOON", 200, 0],
      ["L-LATE", 300, 100],
    ]);
  });

  it("[TC-141] Given signed-off packing lists that together take more of a lot than it holds, as after two trips signed off offline, then the lot is in conflict, counts for neither, and both lists show Conflict: check", () => {
    const lists = [
      { tripId: "TRIP-A", lines: [{ lotId: "L-LATE", quantity: 500 }] },
      {
        tripId: "TRIP-B",
        lines: [
          { lotId: "L-LATE", quantity: 300 },
          { lotId: "L-SOON", quantity: 50 },
        ],
      },
    ];
    const conflicts = stockConflicts([LATE, SOON], lists);
    expect(conflicts).toEqual([
      {
        lotId: "L-LATE",
        tripIds: ["TRIP-A", "TRIP-B"],
        message:
          "Conflict: check: lot L-LATE holds 700, but the signed-off packing lists of TRIP-A and TRIP-B take 800; a person resolves it",
      },
    ]);
    expect(
      availableStock([LATE, SOON], lists).map((l) => [l.lotId, l.quantity]),
    ).toEqual([
      ["L-LATE", 0],
      ["L-SOON", 150],
    ]);
    const signed = signOffPackingList({
      lines: lists[0]?.lines ?? [],
      problems: [],
      role: SIGNING_ROLE,
      personId: "PER-1",
      time: "2026-11-18T15:00:00Z",
    });
    if (!signed.ok) throw new Error(signed.reason);
    expect(
      packingListStatus(lists[0]?.lines ?? [], signed.signOff, conflicts),
    ).toEqual({
      status: "conflict",
      message:
        "Conflict: check: lot L-LATE holds 700, but the signed-off packing lists of TRIP-A and TRIP-B take 800; a person resolves it",
    });
    // A list with no lot in conflict keeps its status.
    expect(
      packingListStatus([{ lotId: "L-SOON", quantity: 1 }], null, conflicts)
        .status,
    ).toBe("not signed off");
    // Lists within a lot's quantity raise no conflict; a lot nobody packs is untouched.
    expect(
      stockConflicts([LATE], [lists[0] ?? { tripId: "", lines: [] }]),
    ).toEqual([]);
    expect(
      stockConflicts(
        [LATE],
        [{ tripId: "TRIP-C", lines: [{ lotId: "L-GONE", quantity: 9 }] }],
      ),
    ).toEqual([]);
  });
  it("[TC-141] Given lists that take exactly what a lot holds, a trip that takes nothing from it, and a list with two lots in conflict, then only real conflicts are named, with every trip that takes the lot", () => {
    const exact = [
      { tripId: "TRIP-A", lines: [{ lotId: "L-SOON", quantity: 150 }] },
      { tripId: "TRIP-B", lines: [{ lotId: "L-SOON", quantity: 50 }] },
    ];
    expect(stockConflicts([SOON], exact)).toEqual([]);
    const over = [
      {
        tripId: "TRIP-A",
        lines: [
          { lotId: "L-SOON", quantity: 150 },
          { lotId: "L-LATE", quantity: 600 },
        ],
      },
      {
        tripId: "TRIP-B",
        lines: [
          { lotId: "L-SOON", quantity: 51 },
          { lotId: "L-LATE", quantity: 101 },
        ],
      },
      { tripId: "TRIP-C", lines: [{ lotId: "L-MID", quantity: 1 }] },
    ];
    const conflicts = stockConflicts([SOON, LATE, MIDDLE], over);
    expect(conflicts.map((c) => [c.lotId, c.tripIds])).toEqual([
      ["L-SOON", ["TRIP-A", "TRIP-B"]],
      ["L-LATE", ["TRIP-A", "TRIP-B"]],
    ]);
    // A list is in conflict when any of its lots is, and every conflict is named.
    expect(
      packingListStatus(
        [
          { lotId: "L-SOON", quantity: 150 },
          { lotId: "L-LATE", quantity: 600 },
          { lotId: "L-MID", quantity: 1 },
        ],
        null,
        conflicts,
      ),
    ).toEqual({
      status: "conflict",
      message: `${conflicts[0]?.message ?? ""} ${conflicts[1]?.message ?? ""}`,
    });
  });

  it("[TC-142] Given the team's lots as recorded, not checked against any trip, and every signed-off packing list, then each lot shows what remains, and a lot the lists together overdraw is in conflict and counts for none", () => {
    const first = pack([LATE], [item(300)]);
    const held = [
      { lotId: "L-LATE", quantity: 700 },
      { lotId: "L-SOON", quantity: 200 },
    ];
    const lists = [{ tripId: "TRIP-A", lines: first.lines }];
    expect(availableStock(held, lists)).toEqual([
      { lotId: "L-LATE", quantity: 400 },
      { lotId: "L-SOON", quantity: 200 },
    ]);
    expect(stockConflicts(held, lists)).toEqual([]);
    const overdrawn = [
      ...lists,
      { tripId: "TRIP-B", lines: pack([LATE], [item(500)]).lines },
    ];
    expect(availableStock(held, overdrawn)).toEqual([
      { lotId: "L-LATE", quantity: 0 },
      { lotId: "L-SOON", quantity: 200 },
    ]);
    expect(stockConflicts(held, overdrawn)).toEqual([
      {
        lotId: "L-LATE",
        tripIds: ["TRIP-A", "TRIP-B"],
        message:
          "Conflict: check: lot L-LATE holds 700, but the signed-off packing lists of TRIP-A and TRIP-B take 800; a person resolves it",
      },
    ]);
  });
});
