// Merging donor lines into lots: acceptance tests from DOC-070 (OD-011, OD-054, SYS-117, ADR-017,
// ADR-024). Every donor, lot number and quantity is synthetic.
import { describe, expect, it } from "vitest";
import {
  mergeDonorLines,
  NO_LOT_NUMBER_FLAG,
  NO_READABLE_EXPIRY_FLAG,
  SAME_LOT_NUMBER_FLAG,
  type DonorLine,
} from "../src/prepped/merge.ts";

const line = (overrides: Partial<DonorLine> = {}): DonorLine => ({
  lineId: "D001-1",
  donorId: "D001",
  lotNumber: "SYN-A100",
  genericName: "Amoxicillin",
  strength: "500 mg",
  dosageForm: "CAPSULE",
  expiry: "2028-01-15",
  manufacturer: "Synthetic Maker X",
  quantity: 60,
  ...overrides,
});

describe("Merging donor lines", () => {
  it("[TC-107] Given two donor lines with the same lot number, generic name, strength, form and expiry from different donors, then they merge into one lot with summed quantity that lists both donors", () => {
    const lots = mergeDonorLines([
      line(),
      line({ lineId: "D002-7", donorId: "D002", quantity: 50 }),
    ]);
    expect(lots).toEqual([
      {
        lineIds: ["D001-1", "D002-7"],
        lotNumber: "SYN-A100",
        genericName: "Amoxicillin",
        strength: "500 mg",
        dosageForm: "CAPSULE",
        expiry: "2028-01-15",
        manufacturer: "Synthetic Maker X",
        quantity: 110,
        donors: [
          {
            donorId: "D001",
            lineId: "D001-1",
            lotNumber: "SYN-A100",
            quantity: 60,
          },
          {
            donorId: "D002",
            lineId: "D002-7",
            lotNumber: "SYN-A100",
            quantity: 50,
          },
        ],
        flags: [],
        needsReview: false,
      },
    ]);
    // Case, surrounding spaces and the way the same expiry is written do not stop a merge.
    const spelled = mergeDonorLines([
      line({ expiry: "01/15/2028" }),
      line({
        lineId: "D002-7",
        donorId: "D002",
        lotNumber: " syn-a100 ",
        genericName: "AMOXICILLIN",
        strength: "500 MG",
        dosageForm: "capsule",
        manufacturer: "synthetic maker x",
      }),
    ]);
    expect(spelled).toHaveLength(1);
    expect(spelled[0]?.quantity).toBe(120);
    // Every line's lot number is kept exactly as entered, for recalls (owner, 2026-11-15).
    expect(spelled[0]?.donors.map((d) => d.lotNumber)).toEqual([
      "SYN-A100",
      " syn-a100 ",
    ]);
  });

  it('[TC-121] Given two donor lines with the same lot number and medicine but expiry dates of 2027-06-30 and 2027-09-30, then they are not merged and both are "needs review"', () => {
    const lots = mergeDonorLines([
      line({ expiry: "2027-06-30" }),
      line({ lineId: "D002-7", donorId: "D002", expiry: "2027-09-30" }),
    ]);
    expect(lots).toHaveLength(2);
    for (const lot of lots) {
      expect(lot.needsReview).toBe(true);
      expect(lot.flags).toEqual([
        SAME_LOT_NUMBER_FLAG,
        "one lot number with two expiry dates (2027-06-30 and 2027-09-30): check",
      ]);
    }
    // Three dates are all named, in date order.
    const three = mergeDonorLines([
      line({ expiry: "2027-09-30" }),
      line({ lineId: "D002-7", expiry: "2027-06-30" }),
      line({ lineId: "D003-2", expiry: "2028-01-31" }),
    ]);
    expect(three[0]?.flags[1]).toBe(
      "one lot number with 3 expiry dates (2027-06-30 and 2027-09-30 and 2028-01-31): check",
    );
  });

  it('[TC-127] Given two donor lines with the same lot number and generic name but different expiry dates, or different manufacturers, then they stay separate lots, both flagged "Same lot number, different details: check"', () => {
    expect(SAME_LOT_NUMBER_FLAG).toBe(
      "Same lot number, different details: check",
    );
    // Different manufacturers: different lots, flagged, but not an expiry conflict (OD-054).
    const makers = mergeDonorLines([
      line({ expiry: "2027-06-30" }),
      line({
        lineId: "D002-7",
        manufacturer: "Synthetic Maker Y",
        expiry: "2027-09-30",
      }),
    ]);
    expect(makers.map((l) => [l.lineIds, l.flags, l.needsReview])).toEqual([
      [["D001-1"], [SAME_LOT_NUMBER_FLAG], false],
      [["D002-7"], [SAME_LOT_NUMBER_FLAG], false],
    ]);
    // A different strength or form keeps them apart, flagged.
    for (const other of [
      { strength: "250 mg" },
      { dosageForm: "TABLET" },
      { genericName: "Ampicillin" },
    ]) {
      const lots = mergeDonorLines([
        line(),
        line({ lineId: "D002-7", ...other }),
      ]);
      expect(
        lots.map((l) => l.flags),
        JSON.stringify(other),
      ).toEqual([[SAME_LOT_NUMBER_FLAG], [SAME_LOT_NUMBER_FLAG]]);
      expect(lots.every((l) => !l.needsReview)).toBe(true);
    }
  });
});

describe("Donor lines that never merge", () => {
  it("[SYS-117] Given a line without a manufacturer, then it never merges and raises no expiry conflict, but a line sharing its lot number is flagged (owner, 2026-11-13)", () => {
    const lots = mergeDonorLines([
      line(),
      line({ lineId: "D002-7", manufacturer: null }),
      line({ lineId: "D003-2", manufacturer: "  ", expiry: "2027-06-30" }),
    ]);
    expect(lots.map((l) => [l.lineIds, l.flags, l.needsReview])).toEqual([
      [["D001-1"], [SAME_LOT_NUMBER_FLAG], false],
      [["D002-7"], [SAME_LOT_NUMBER_FLAG], false],
      [["D003-2"], [SAME_LOT_NUMBER_FLAG], false],
    ]);
  });

  it("[SYS-117] Given lines without a lot number, or without a readable expiry, then they never merge and each needs clarification with the donor (owner, 2026-11-15)", () => {
    const noLot = mergeDonorLines([
      line({ lotNumber: null }),
      line({ lineId: "D002-7", lotNumber: " " }),
    ]);
    expect(noLot.map((l) => [l.lineIds, l.flags, l.needsReview])).toEqual([
      [["D001-1"], [NO_LOT_NUMBER_FLAG], true],
      [["D002-7"], [NO_LOT_NUMBER_FLAG], true],
    ]);
    const noExpiry = mergeDonorLines([
      line({ expiry: null }),
      line({ lineId: "D002-7", expiry: "2028-02-30" }),
    ]);
    expect(
      noExpiry.map((l) => [l.lineIds, l.expiry, l.flags, l.needsReview]),
    ).toEqual([
      [["D001-1"], null, [NO_READABLE_EXPIRY_FLAG, SAME_LOT_NUMBER_FLAG], true],
      [
        ["D002-7"],
        "2028-02-30",
        [NO_READABLE_EXPIRY_FLAG, SAME_LOT_NUMBER_FLAG],
        true,
      ],
    ]);
    expect(NO_LOT_NUMBER_FLAG).toBe(
      "no lot number recorded: clarify with the donor before accepting this donation",
    );
    expect(NO_READABLE_EXPIRY_FLAG).toBe(
      "no readable expiry date: clarify with the donor before accepting this donation",
    );
  });

  it("[SYS-117] Given three lines of one lot and a fourth of another lot, then the three merge in entry order and the fourth stays alone, unflagged", () => {
    const lots = mergeDonorLines([
      line(),
      line({ lineId: "D009-1", lotNumber: "SYN-B200", quantity: 5 }),
      line({ lineId: "D002-7", donorId: "D002", quantity: 10 }),
      line({ lineId: "D003-2", donorId: "D003", quantity: 1 }),
    ]);
    expect(lots.map((l) => [l.lineIds, l.quantity, l.flags])).toEqual([
      [["D001-1", "D002-7", "D003-2"], 71, []],
      [["D009-1"], 5, []],
    ]);
    expect(mergeDonorLines([])).toEqual([]);
  });

  it("[SYS-117] Given two lines that both lack a lot number, or both lack a manufacturer, then they stay apart; lines without a lot number need clarification but are never flagged as sharing a lot number", () => {
    expect(
      mergeDonorLines([
        line({ lotNumber: null }),
        line({ lineId: "D002-7", lotNumber: null }),
      ]).map((l) => l.flags),
    ).toEqual([[NO_LOT_NUMBER_FLAG], [NO_LOT_NUMBER_FLAG]]);
    const noMaker = mergeDonorLines([
      line({ manufacturer: null }),
      line({ lineId: "D002-7", manufacturer: null }),
    ]);
    expect(noMaker.map((l) => [l.lineIds, l.flags, l.needsReview])).toEqual([
      [["D001-1"], [SAME_LOT_NUMBER_FLAG], false],
      [["D002-7"], [SAME_LOT_NUMBER_FLAG], false],
    ]);
  });

  it("[SYS-117] Given the same lot from the same maker with one readable and one unreadable expiry, then they are flagged but not called a conflict of two dates", () => {
    const lots = mergeDonorLines([
      line(),
      line({ lineId: "D002-7", expiry: "soon" }),
    ]);
    expect(lots.map((l) => [l.flags, l.needsReview])).toEqual([
      [[SAME_LOT_NUMBER_FLAG], false],
      [[NO_READABLE_EXPIRY_FLAG, SAME_LOT_NUMBER_FLAG], true],
    ]);
  });

  it("[TC-107] Given details that would read the same if run together, then they are still told apart; lines with no strength recorded merge when everything else matches", () => {
    const runTogether = mergeDonorLines([
      line(),
      line({
        lineId: "D002-7",
        genericName: "Amoxicillin5",
        strength: "00 mg",
      }),
    ]);
    expect(runTogether).toHaveLength(2);
    const noStrength = mergeDonorLines([
      line({ strength: null }),
      line({ lineId: "D002-7", strength: null }),
    ]);
    expect(noStrength).toHaveLength(1);
    expect(noStrength[0]?.quantity).toBe(120);
  });
});
