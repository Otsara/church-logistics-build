// Prepped lot eligibility acceptance tests from DOC-070 (SYS-101 to SYS-105, SYS-109, SYS-116).
// Medicine names are real FDA directory names; every lot, date and quantity is synthetic.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseNdcRecord,
  routeScopeSchema,
  type CatalogEntry,
} from "../../synth/src/fda.ts";
import { parseRuleFile } from "../src/rule-file.ts";
import { parseIsoDate } from "../src/dates.ts";
import {
  checkLot,
  type EligibilityRules,
  type LotFacts,
} from "../src/prepped/eligibility.ts";

const d = parseIsoDate;

/** The trip used throughout DOC-070: arriving 2026-12-01, checked on 2026-11-11, 365-day minimum. */
const TRIP: EligibilityRules = {
  arrival: d("2026-12-01"),
  checkDate: d("2026-11-11"),
  minimumDaysAtArrival: 365,
};

/** An ordinary in-scope, uncontrolled, room-temperature lot; each test changes what it needs. */
const lot = (overrides: Partial<LotFacts> = {}): LotFacts => ({
  id: "LOT-T1",
  expiry: "2028-01-15",
  controlled: "no",
  controlledBasis:
    "FDA drug directory: no DEA schedule recorded (US scheduling only)",
  coldChain: false,
  inScope: true,
  scopeReason: null,
  ...overrides,
});

// The verified route rule file, so the route tests follow it (OD-042).
const routeFile = parseRuleFile(
  JSON.parse(
    readFileSync(
      join(import.meta.dirname, "../../../rules/prepped/route-scope.json"),
      "utf8",
    ),
  ),
);
if (!routeFile.ok) throw new Error(routeFile.errors.join("\n"));
const routeRules = routeScopeSchema.parse(routeFile.file.data);

/** A catalogue entry built by the openFDA importer from a record in openFDA's shape. */
const entryFor = (
  dosageForm: string,
  route: string,
  name = "Synthetic test medicine",
): CatalogEntry => {
  const result = parseNdcRecord(
    {
      product_ndc: `T-${route}-${dosageForm}`,
      generic_name: name,
      dosage_form: dosageForm,
      route: [route],
      product_type: "HUMAN OTC DRUG",
    },
    routeRules,
  );
  if (!result.ok) throw new Error(result.problems.join("\n"));
  return result.entry;
};

/** A lot of a catalogue entry, taking its scope and controlled status from the entry. */
const lotOf = (entry: CatalogEntry): LotFacts =>
  lot({
    id: `LOT-${entry.sourceId}`,
    controlled: entry.controlled,
    controlledBasis: entry.controlledBasis,
    inScope: entry.inScope,
    scopeReason: entry.scopeReason,
  });

describe("Prepped lot eligibility", () => {
  it('[TC-101] Given a lot expiring 2027-03-01 and a trip arriving 2026-12-01, when eligibility runs with the 365-day rule, then the lot is blocked with the reason "90 days remaining, 365 required"', () => {
    const result = checkLot(lot({ expiry: "2027-03-01" }), TRIP);
    expect(result.status).toBe("blocked");
    expect(result.reasons).toEqual(["90 days remaining, 365 required"]);
    expect(result.daysRemaining).toBe(90);
  });

  it("[TC-102] Given a lot expiring 2028-01-15 and the same trip, then it is eligible with 410 days remaining", () => {
    const result = checkLot(lot({ expiry: "2028-01-15" }), TRIP);
    expect(result).toEqual({
      lotId: "LOT-T1",
      status: "eligible",
      reasons: ["410 days remaining, 365 required"],
      expiry: "2028-01-15",
      expiryMonthOnly: false,
      daysRemaining: 410,
    });
  });

  it("[TC-103] Given a lot marked controlled, then it is blocked whatever its expiry", () => {
    const controlled = {
      controlled: "yes",
      controlledBasis: "FDA drug directory: DEA schedule CII",
    } as const;
    const reason =
      "controlled substance (FDA drug directory: DEA schedule CII): cannot be packed in this build";
    for (const expiry of ["2030-06-30", "2027-03-01", "2027-12-01", null, ""]) {
      const result = checkLot(lot({ ...controlled, expiry }), TRIP);
      expect(result.status, String(expiry)).toBe("blocked");
      expect(result.reasons[0], String(expiry)).toBe(reason);
    }
    expect(
      checkLot(lot({ ...controlled, expiry: "2030-06-30" }), TRIP).reasons,
    ).toEqual([reason, "1307 days remaining, 365 required"]);
  });

  it('[TC-104] Given a lot with no expiry date, then it is "needs review" and excluded from readiness', () => {
    for (const expiry of [null, "", "   "]) {
      const result = checkLot(lot({ expiry }), TRIP);
      expect(result.status, JSON.stringify(expiry)).toBe("needs_review");
      expect(result.reasons).toEqual([
        "no expiry date recorded: check the lot",
      ]);
      expect(result.expiry).toBeNull();
      expect(result.daysRemaining).toBeNull();
    }
    // An expiry that cannot be read is treated the same way: never guessed (SYS-105).
    const unreadable = checkLot(lot({ expiry: "2028-02-30" }), TRIP);
    expect(unreadable.status).toBe("needs_review");
    expect(unreadable.reasons).toEqual([
      'expiry date not readable: "2028-02-30": check the lot',
    ]);
    expect(unreadable.expiry).toBeNull();
    expect(unreadable.expiryMonthOnly).toBe(false);
    expect(unreadable.daysRemaining).toBeNull();
  });

  it("[TC-108] Given the arrival date moves 30 days later, then eligibility recalculates without calling any AI step", () => {
    const facts = lot({ expiry: "2027-12-20" });
    const before = checkLot(facts, TRIP);
    const after = checkLot(facts, { ...TRIP, arrival: d("2026-12-31") });
    expect(before.status).toBe("eligible");
    expect(before.daysRemaining).toBe(384);
    expect(after.status).toBe("blocked");
    expect(after.daysRemaining).toBe(354);
    expect(after.reasons).toEqual(["354 days remaining, 365 required"]);
    // The rules import nothing outside packages/core, so no AI step can be called (SYS-003).
    const dir = join(import.meta.dirname, "../src/prepped");
    for (const file of readdirSync(dir)) {
      const source = readFileSync(join(dir, file), "utf8");
      const imports = [...source.matchAll(/from\s+"([^"]+)"/g)].map(
        (m) => m[1],
      );
      for (const path of imports)
        expect(path, `${file} imports ${String(path)}`).toMatch(/^\.\.?\//);
    }
  });

  it('[TC-109] Given a lot marked cold chain that would otherwise be eligible (expiring 2028-01-15, trip arriving 2026-12-01), then it is blocked with the reason "cold-chain items are not handled in this build"', () => {
    const result = checkLot(lot({ coldChain: true }), TRIP);
    expect(result.status).toBe("blocked");
    expect(result.reasons).toEqual([
      "cold-chain items are not handled in this build",
      "410 days remaining, 365 required",
    ]);
  });

  it('[TC-110] Given a lot for injection (route: intravenous), needing no cold chain, expiring 2028-01-15, and a trip arriving 2026-12-01, then it is blocked with the reason "outside this build\'s scope"', () => {
    const result = checkLot(lotOf(entryFor("INJECTION", "INTRAVENOUS")), TRIP);
    expect(result.status).toBe("blocked");
    expect(result.reasons).toEqual([
      "outside this build's scope: route not mapped: INTRAVENOUS",
      "410 days remaining, 365 required",
    ]);
    // A reason that already says so is not repeated, and a missing reason still blocks.
    expect(
      checkLot(lotOf(entryFor("GAS", "RESPIRATORY (INHALATION)")), TRIP)
        .reasons[0],
    ).toBe("outside this build's scope: dosage form GAS");
    const noReason = checkLot(lot({ inScope: false }), TRIP);
    expect(noReason.status).toBe("blocked");
    expect(noReason.reasons[0]).toBe("outside this build's scope");
  });

  it("[TC-111] Given a skin cream lot and an eye-drop lot, neither needing a cold chain, both expiring 2028-01-15, and a trip arriving 2026-12-01, then both are eligible", () => {
    for (const [form, route] of [
      ["CREAM", "TOPICAL"],
      ["SOLUTION/ DROPS", "OPHTHALMIC"],
    ] as const) {
      const result = checkLot(lotOf(entryFor(form, route)), TRIP);
      expect(result.status, route).toBe("eligible");
    }
  });

  it("[TC-118] Given inhaled, nasal, vaginal, ear and eye lots, none needing a cold chain, all expiring 2028-01-15, and a trip arriving 2026-12-01, then all are eligible", () => {
    for (const [form, route] of [
      ["AEROSOL, METERED", "RESPIRATORY (INHALATION)"],
      ["SPRAY, METERED", "NASAL"],
      ["CREAM", "VAGINAL"],
      ["SOLUTION/ DROPS", "AURICULAR (OTIC)"],
      ["OINTMENT", "OPHTHALMIC"],
    ] as const) {
      const result = checkLot(lotOf(entryFor(form, route)), TRIP);
      expect(result.status, route).toBe("eligible");
    }
  });

  it('[TC-120] Given a lot expiring 2026-11-01 and a check made on 2026-11-11, then the lot is listed as "Discard: expired" and is never eligible', () => {
    const result = checkLot(lot({ expiry: "2026-11-01" }), TRIP);
    expect(result).toEqual({
      lotId: "LOT-T1",
      status: "discard",
      reasons: ["Discard: expired"],
      expiry: "2026-11-01",
      expiryMonthOnly: false,
      daysRemaining: -30,
    });
    // Expiring on the day of the check is not yet past; the day before is (SYS-116).
    expect(checkLot(lot({ expiry: "2026-11-11" }), TRIP).status).toBe(
      "blocked",
    );
    expect(checkLot(lot({ expiry: "2026-11-10" }), TRIP).status).toBe(
      "discard",
    );
    // A minimum that would let it through still never makes an expired lot eligible.
    const lenient = { ...TRIP, minimumDaysAtArrival: -100 };
    expect(checkLot(lot({ expiry: "2026-11-01" }), lenient).status).toBe(
      "discard",
    );
    // Other blocks are still listed, so the reason it was never packable stays visible.
    expect(
      checkLot(lot({ expiry: "2026-11-01", coldChain: true }), TRIP),
    ).toMatchObject({
      status: "discard",
      reasons: [
        "cold-chain items are not handled in this build",
        "Discard: expired",
      ],
    });
  });

  it('[TC-128] Given a trip arriving 2026-12-01, then a lot expiring 2027-12-01 is eligible and a lot expiring 2027-11-30 is blocked with the reason "364 days remaining, 365 required"', () => {
    expect(checkLot(lot({ expiry: "2027-12-01" }), TRIP)).toMatchObject({
      status: "eligible",
      reasons: ["365 days remaining, 365 required"],
      daysRemaining: 365,
    });
    expect(checkLot(lot({ expiry: "2027-11-30" }), TRIP)).toMatchObject({
      status: "blocked",
      reasons: ["364 days remaining, 365 required"],
      daysRemaining: 364,
    });
  });

  it("[TC-129] Given a lot whose expiry is entered as 03/2028, then its expiry is read as 2028-03-31 and shown as read from a month-only date", () => {
    expect(checkLot(lot({ expiry: "03/2028" }), TRIP)).toEqual({
      lotId: "LOT-T1",
      status: "eligible",
      reasons: [
        "486 days remaining, 365 required",
        "expiry read from a month-only date (03/2028) as 2028-03-31",
      ],
      expiry: "2028-03-31",
      expiryMonthOnly: true,
      daysRemaining: 486,
    });
    // One-digit months, February in leap and common years, and surrounding spaces.
    expect(checkLot(lot({ expiry: " 2/2028 " }), TRIP).expiry).toBe(
      "2028-02-29",
    );
    expect(checkLot(lot({ expiry: "02/2027" }), TRIP).expiry).toBe(
      "2027-02-28",
    );
    expect(checkLot(lot({ expiry: "12/2027" }), TRIP).expiry).toBe(
      "2027-12-31",
    );
    expect(checkLot(lot({ expiry: "01/2028" }), TRIP).expiry).toBe(
      "2028-01-31",
    );
    // A month-only date that is already over is discarded, with the reading still shown.
    expect(checkLot(lot({ expiry: "10/2026" }), TRIP).reasons).toEqual([
      "Discard: expired",
      "expiry read from a month-only date (10/2026) as 2026-10-31",
    ]);
    // Month 0, month 13 and three-digit months are not dates: never guessed (SYS-105).
    for (const text of [
      "00/2028",
      "13/2028",
      "003/2028",
      "3/28",
      "03-2028",
      "03/2028x",
      "x03/2028",
    ]) {
      expect(checkLot(lot({ expiry: text }), TRIP).status, text).toBe(
        "needs_review",
      );
    }
  });
});
