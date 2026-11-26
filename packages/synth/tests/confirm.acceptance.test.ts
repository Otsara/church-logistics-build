// The checks of the pre-release confirmation run (DOC-070 §5; DAT-002): rules that must hold for
// every lot and trip in a set of synthetic scenarios. Here they run on the development two thirds
// only; the held-back third is opened only at the confirmation run, with the owner present.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assessFloor,
  checkLot,
  type LotEligibility,
} from "@church-logistics/core";
import { describe, expect, it } from "vitest";
import { checkDonorList } from "../../ai/src/steps/donor-list.ts";
import { compareReadings, confirmPrepped } from "../src/confirm.ts";
import type { PreppedData } from "../src/prepped.ts";

const ROOT = join(import.meta.dirname, "../../..");
const development = (
  JSON.parse(
    readFileSync(join(ROOT, "data/synthetic/development/prepped.json"), "utf8"),
  ) as { scenarios: { id: string; data: PreppedData }[] }
).scenarios;

describe("Confirmation-run checks (DOC-070 §5)", () => {
  it("[TC-034] Given the development Prepped scenarios, then every lot and trip keeps the rules: nothing expired, controlled, cold-chain or short of shelf life goes, each lot that cannot go has a reason, Go only when nothing stands in the way, the meter stays between 0 and 1, and only eligible lots count", () => {
    expect(development.length).toBeGreaterThan(0);
    for (const s of development) {
      const result = confirmPrepped(s.id, s.data, 365);
      expect(result.failures, s.id).toEqual([]);
      expect(result.lotChecks).toBe(s.data.lots.length * s.data.trips.length);
      expect(result.trips).toBe(s.data.trips.length);
    }
  });

  it("[TC-034] Given rules that let every lot go, report Go regardless, or throw, then each broken rule is reported, never passed", () => {
    const s = development[0];
    if (s === undefined) throw new Error("no development scenario");
    const everyLotGoes = (lot: { id: string }): LotEligibility => ({
      lotId: lot.id,
      status: "eligible",
      reasons: [],
      expiry: null,
      expiryMonthOnly: false,
      daysRemaining: null,
    });
    const lenient = confirmPrepped(s.id, s.data, 365, {
      checkLot: everyLotGoes,
      assessFloor: (input) => ({
        ...assessFloor(input),
        indicator: "Go",
        meter: { coverage: 2, documents: -1, overall: 0.5 },
      }),
    });
    const said = lenient.failures.join("\n");
    for (const expected of [
      "expired but not set aside",
      "short of shelf life at arrival but eligible",
      "says Go while something stands in the way",
      "meter coverage outside 0 to 1",
      "meter documents outside 0 to 1",
    ])
      expect(said).toContain(expected);
    // A lot that cannot go must give a reason.
    const silent = confirmPrepped(s.id, s.data, 365, {
      checkLot: (lot, rules) => ({ ...checkLot(lot, rules), reasons: [] }),
      assessFloor,
    });
    expect(silent.failures.join("\n")).toContain("has no reason");
    // A lot that is not eligible must never be counted toward the floor.
    const counting = confirmPrepped(s.id, s.data, 365, {
      checkLot,
      assessFloor: (input) => {
        const a = assessFloor(input);
        const notEligible = input.lots.find(
          (l) => l.eligibility.status !== "eligible",
        );
        const [first, ...rest] = a.items;
        if (notEligible === undefined || first === undefined) return a;
        return {
          ...a,
          items: [
            {
              ...first,
              lots: [
                ...first.lots,
                {
                  lotId: notEligible.lotId,
                  donorId: notEligible.donorId,
                  manufacturer: null,
                  quantity: notEligible.quantity,
                },
              ],
            },
            ...rest,
          ],
        };
      },
    });
    expect(counting.failures.join("\n")).toContain("which is not eligible");
    // A rule that throws is a failure, not a crash of the run.
    const throwing = confirmPrepped(s.id, s.data, 365, {
      checkLot: () => {
        throw new Error("boom");
      },
      assessFloor,
    });
    expect(throwing.failures[0]).toContain("threw: boom");
  });
});

describe("Confirmation-run comparison of AI readings with the truth (DOC-070 §5)", () => {
  const s = development[0];
  if (s === undefined) throw new Error("no development scenario");
  const lots = s.data.lots.slice(0, 3);
  const lines = lots.map((l) => l.sourceLine);
  const copy = (l: (typeof lots)[number], i: number) => ({
    line: i + 1,
    source_line: l.sourceLine,
    generic_name: l.genericName,
    strength: l.strength,
    dosage_form: l.dosageForm,
    quantity: l.quantity,
    lot_number: l.lotNumber,
    expiry_text: l.expiry,
    manufacturer: null,
    confidence: 0.9,
  });

  it("[TC-034] Given readings that copy every line correctly, then each is exact and none is a silent error", () => {
    const result = checkDonorList({ lines }, { lots: lots.map(copy) });
    const c = compareReadings(lots, result);
    expect(c).toMatchObject({ lines: 3, exact: 3, flagged: 0, unread: 0 });
    expect(c.silentErrors).toEqual([]);
  });

  it("[TC-034] Given a reading that the check accepts but that differs from the label, then it is a silent error; a flagged or unread line is not", () => {
    const [a, b] = lots.map(copy);
    if (a === undefined || b === undefined)
      throw new Error("three lots needed");
    // A name cut short, but present in the line, so the copy check cannot catch it.
    const firstWord = lots[0]?.strength?.split(" ")[0] ?? "";
    const wrong = { ...a, generic_name: firstWord };
    const flagged = { ...b, lot_number: null };
    const result = checkDonorList({ lines }, { lots: [wrong, flagged] });
    const r = compareReadings(lots, result);
    expect(r).toMatchObject({ lines: 3, exact: 0, flagged: 1, unread: 1 });
    expect(r.silentErrors).toHaveLength(1);
    expect(r.silentErrors[0]?.toLowerCase()).toBe(
      `line 1: medicine name read as ${firstWord}, label says ${String(lots[0]?.genericName)}`.toLowerCase(),
    );
  });
});

describe("Confirmation-run edge cases (DOC-070 §5)", () => {
  it("[TC-034] Given a reading of a line that was never given, or a rule that throws a value that is not an Error, then each is reported", () => {
    const s = development[0];
    if (s === undefined) throw new Error("no development scenario");
    const lots = s.data.lots.slice(0, 1);
    const ghost = compareReadings(lots, {
      lines: [
        {
          line: 2,
          needsReview: false,
          genericName: null,
          strength: null,
          dosageForm: null,
          quantity: null,
          lotNumber: null,
          expiry: null,
        },
      ],
      unread: [],
    });
    expect(ghost.silentErrors).toEqual(["line 2: no such line was given"]);
    const odd = confirmPrepped(s.id, s.data, 365, {
      checkLot: () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- a rule that throws a value that is not an Error is reported too
        throw "not an Error";
      },
      assessFloor,
    });
    expect(odd.failures[0]).toContain("a rule threw: not an Error");
  });
});
