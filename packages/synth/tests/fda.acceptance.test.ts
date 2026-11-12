import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseRuleFile } from "@church-logistics/core";
import { describe, expect, it } from "vitest";
import {
  buildCatalog,
  parseNdcRecord,
  routeScopeSchema,
  type RouteScopeRules,
} from "../src/fda.ts";

// The real rule file, so a change to it is tested too.
const file = parseRuleFile(
  JSON.parse(
    readFileSync(
      join(import.meta.dirname, "../../../rules/prepped/route-scope.json"),
      "utf8",
    ),
  ),
);
if (!file.ok) throw new Error(file.errors.join("\n"));
const rules: RouteScopeRules = routeScopeSchema.parse(file.file.data);

// Records in the shape openFDA publishes. Medicine names are real; everything else is synthetic.
const tablet = {
  product_ndc: "00000-0001",
  generic_name: "Amoxicillin",
  dosage_form: "CAPSULE",
  route: ["ORAL"],
  active_ingredients: [{ name: "AMOXICILLIN", strength: "500 mg/1" }],
  pharm_class: ["Penicillin-class Antibacterial [EPC]", "Penicillins [CS]"],
};

// How a missing schedule reads (OD-044): not controlled in the US, with the source shown.
const NOT_SCHEDULED =
  "FDA drug directory: no DEA schedule recorded (US scheduling only)";

/** A copy of a record without one field, as openFDA does when it has no value. */
const omit = (record: object, key: string): Record<string, unknown> =>
  Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));

describe("openFDA importer", () => {
  it("[TC-123] reads an in-scope product without a schedule as not controlled, with its source, and flags controlled, injected and unmapped ones", () => {
    const ok = parseNdcRecord(tablet, rules);
    expect(ok).toEqual({
      ok: true,
      entry: {
        sourceId: "00000-0001",
        otherSourceIds: [],
        genericName: "Amoxicillin",
        dosageForm: "CAPSULE",
        strength: "AMOXICILLIN 500 mg/1",
        fdaRoutes: ["ORAL"],
        routes: ["oral"],
        inScope: true,
        scopeReason: null,
        controlled: "no",
        controlledBasis: NOT_SCHEDULED,
        classes: ["Penicillin-class Antibacterial"],
      },
    });
    const controlled = parseNdcRecord(
      { ...tablet, dea_schedule: "CII" },
      rules,
    );
    expect(
      controlled.ok && [
        controlled.entry.controlled,
        controlled.entry.controlledBasis,
      ],
    ).toEqual(["yes", "FDA drug directory: DEA schedule CII"]);
    const injected = parseNdcRecord(
      { ...tablet, route: ["INTRAVENOUS"] },
      rules,
    );
    expect(
      injected.ok && [injected.entry.inScope, injected.entry.scopeReason],
    ).toEqual([false, "route not mapped: INTRAVENOUS"]);
    const mixed = parseNdcRecord(
      { ...tablet, route: ["oral ", "BUCCAL"] },
      rules,
    );
    expect(
      mixed.ok && [
        mixed.entry.inScope,
        mixed.entry.routes,
        mixed.entry.scopeReason,
      ],
    ).toEqual([false, ["oral"], "route not mapped: BUCCAL"]);
  });

  it("[TC-123] keeps only established pharmacologic classes (EPC) as the class, and none when the record has none", () => {
    const several = parseNdcRecord(
      {
        ...tablet,
        pharm_class: [
          "Penicillin-class Antibacterial  [EPC]",
          "Penicillins [CS]",
          " Beta-Lactamase Inhibitor [EPC] ",
          "Penicillin-class Antibacterial [EPC]",
          "Beta Lactamase Inhibitors [MoA]",
        ],
      },
      rules,
    );
    expect(several.ok && several.entry.classes).toEqual([
      "Beta-Lactamase Inhibitor",
      "Penicillin-class Antibacterial",
    ]);
    const none = parseNdcRecord(omit(tablet, "pharm_class"), rules);
    expect(none.ok && none.entry.classes).toEqual([]);
    const noEpc = parseNdcRecord(
      { ...tablet, pharm_class: ["Penicillins [CS]", "[EPC]"] },
      rules,
    );
    expect(noEpc.ok && noEpc.entry.classes).toEqual([]);
  });

  it("[TC-123] treats biologic product types as cold chain, so out of scope whatever the route (OD-049)", () => {
    for (const type of [
      "VACCINE",
      "PLASMA DERIVATIVE",
      "CELLULAR THERAPY",
      "STANDARDIZED ALLERGENIC",
      "NON-STANDARDIZED ALLERGENIC",
      "LICENSED VACCINE BULK INTERMEDIATE",
    ]) {
      const result = parseNdcRecord({ ...tablet, product_type: type }, rules);
      expect(
        result.ok && [result.entry.inScope, result.entry.scopeReason],
        type,
      ).toEqual([false, `biologic, treated as cold chain: ${type}`]);
    }
    const padded = parseNdcRecord(
      { ...tablet, product_type: " vaccine " },
      rules,
    );
    expect(padded.ok && padded.entry.scopeReason).toBe(
      "biologic, treated as cold chain: VACCINE",
    );
    for (const type of ["HUMAN PRESCRIPTION DRUG", "HUMAN OTC DRUG"]) {
      const result = parseNdcRecord({ ...tablet, product_type: type }, rules);
      expect(result.ok && result.entry.inScope, type).toBe(true);
    }
    const unmappedFirst = parseNdcRecord(
      { ...tablet, route: ["BUCCAL"], product_type: "VACCINE" },
      rules,
    );
    expect(unmappedFirst.ok && unmappedFirst.entry.scopeReason).toBe(
      "biologic, treated as cold chain: VACCINE",
    );
    const merged = buildCatalog(
      [
        tablet,
        { ...tablet, product_ndc: "00000-0009", product_type: "VACCINE" },
      ],
      rules,
    );
    expect(merged.entries[0]?.inScope).toBe(false);
  });

  it("[ARC-015] maps every in-scope route the owner named", () => {
    const terms = [
      "ORAL",
      "SUBLINGUAL",
      "RECTAL",
      "TOPICAL",
      "CUTANEOUS",
      "OPHTHALMIC",
      "RESPIRATORY (INHALATION)",
      "NASAL",
      "VAGINAL",
      "AURICULAR (OTIC)",
    ];
    for (const term of terms) {
      const result = parseNdcRecord({ ...tablet, route: [term] }, rules);
      expect(result.ok && result.entry.inScope, term).toBe(true);
    }
  });

  it("[ARC-015] treats missing routes, empty schedules and categories removed from scope cautiously", () => {
    const noRoute = parseNdcRecord({ ...tablet, route: [] }, rules);
    expect(
      noRoute.ok && [noRoute.entry.inScope, noRoute.entry.scopeReason],
    ).toEqual([false, "no route recorded"]);
    const withoutRoute = omit(tablet, "route");
    const absent = parseNdcRecord(withoutRoute, rules);
    expect(absent.ok && absent.entry.scopeReason).toBe("no route recorded");
    const empty = parseNdcRecord({ ...tablet, dea_schedule: "" }, rules);
    expect(
      empty.ok && [empty.entry.controlled, empty.entry.controlledBasis],
    ).toEqual(["no", NOT_SCHEDULED]);
    const nullSchedule = parseNdcRecord(
      { ...tablet, dea_schedule: null },
      rules,
    );
    expect(nullSchedule.ok && nullSchedule.entry.controlled).toBe("no");
    const padded = parseNdcRecord({ ...tablet, dea_schedule: " CIV " }, rules);
    expect(padded.ok && padded.entry.controlledBasis).toBe(
      "FDA drug directory: DEA schedule CIV",
    );
    // Feeding tube is not a route category (OD-045): ENTERAL stays out of scope.
    const enteral = parseNdcRecord({ ...tablet, route: ["ENTERAL"] }, rules);
    expect(enteral.ok && enteral.entry.scopeReason).toBe(
      "route not mapped: ENTERAL",
    );
    const narrowed: RouteScopeRules = {
      ...rules,
      in_scope: rules.in_scope.filter((c) => c !== "oral"),
    };
    const out = parseNdcRecord(tablet, narrowed);
    expect(out.ok && [out.entry.inScope, out.entry.scopeReason]).toEqual([
      false,
      "outside this build's scope: oral",
    ]);
    const noStrength = parseNdcRecord(
      {
        ...tablet,
        active_ingredients: [{ name: "A" }, { name: "B", strength: "1 mg" }],
      },
      rules,
    );
    expect(noStrength.ok && noStrength.entry.strength).toBe("A; B 1 mg");
    const noIngredients = parseNdcRecord(
      { ...tablet, active_ingredients: [] },
      rules,
    );
    expect(noIngredients.ok && noIngredients.entry.strength).toBe(null);
    const sameCategoryTwice = parseNdcRecord(
      { ...tablet, route: ["TOPICAL", "CUTANEOUS"] },
      rules,
    );
    expect(
      sameCategoryTwice.ok && [
        sameCategoryTwice.entry.routes,
        sameCategoryTwice.entry.inScope,
      ],
    ).toEqual([["topical"], true]);
  });

  it("[ARC-015] rejects records it cannot read, naming the problem and the product when known", () => {
    const missing = parseNdcRecord(
      { product_ndc: "00000-0009", dosage_form: "TABLET" },
      rules,
    );
    expect(missing.ok).toBe(false);
    expect(!missing.ok && missing.sourceId).toBe("00000-0009");
    expect(!missing.ok && missing.problems.join("\n")).toMatch(/generic_name/);
    const notObject = parseNdcRecord("text", rules);
    expect(
      !notObject.ok && [
        notObject.sourceId,
        notObject.problems[0]?.startsWith("(record)"),
      ],
    ).toEqual([null, true]);
    const badId = parseNdcRecord({ product_ndc: 12 }, rules);
    expect(!badId.ok && badId.sourceId).toBe(null);
  });

  it("[ARC-015] merges the same product from several labelers, keeping the most cautious reading", () => {
    const catalog = buildCatalog(
      [
        tablet,
        {
          ...tablet,
          product_ndc: "00000-0002",
          generic_name: "AMOXICILLIN",
          dea_schedule: "CIV",
        },
        { ...tablet, product_ndc: "00000-0003" },
        {
          ...tablet,
          product_ndc: "00000-0004",
          route: ["ORAL", "INTRAVENOUS"],
          pharm_class: ["Aminopenicillin [EPC]"],
        },
        {
          ...tablet,
          product_ndc: "00000-0005",
          generic_name: "Ibuprofen",
          active_ingredients: [{ name: "IBUPROFEN", strength: "200 mg/1" }],
        },
        { product_ndc: "bad" },
      ],
      rules,
    );
    expect(catalog.entries).toHaveLength(2);
    const amox = catalog.entries[0];
    expect(amox?.otherSourceIds).toEqual([
      "00000-0002",
      "00000-0003",
      "00000-0004",
    ]);
    expect([amox?.controlled, amox?.controlledBasis]).toEqual([
      "yes",
      "FDA drug directory: DEA schedule CIV",
    ]);
    expect(amox?.inScope).toBe(false);
    expect(amox?.scopeReason).toBe("route not mapped: INTRAVENOUS");
    expect(amox?.fdaRoutes).toEqual(["ORAL", "INTRAVENOUS"]);
    expect(amox?.classes).toEqual([
      "Aminopenicillin",
      "Penicillin-class Antibacterial",
    ]);
    expect(catalog.rejected.map((r) => r.sourceId)).toEqual(["bad"]);
    const noStrength = omit(tablet, "active_ingredients");
    const strengthless = buildCatalog(
      [noStrength, { ...noStrength, product_ndc: "00000-0006" }],
      rules,
    );
    expect(
      strengthless.entries.map((e) => [e.strength, e.otherSourceIds]),
    ).toEqual([[null, ["00000-0006"]]]);
    const keepsFirstScheduled = buildCatalog(
      [
        { ...tablet, dea_schedule: "CIII" },
        { ...tablet, product_ndc: "00000-0007", dea_schedule: "CIV" },
        { ...tablet, product_ndc: "00000-0008" },
      ],
      rules,
    );
    expect([
      keepsFirstScheduled.entries[0]?.controlled,
      keepsFirstScheduled.entries[0]?.controlledBasis,
    ]).toEqual(["yes", "FDA drug directory: DEA schedule CIII"]);
  });
});

describe("openFDA importer details", () => {
  it("[ARC-015] trims names and route terms, ignores blank route entries, and survives a null record", () => {
    const padded = parseNdcRecord(
      {
        ...tablet,
        generic_name: "  Amoxicillin ",
        dosage_form: " CAPSULE ",
        route: [" oral ", "  "],
      },
      rules,
    );
    expect(
      padded.ok && [
        padded.entry.genericName,
        padded.entry.dosageForm,
        padded.entry.fdaRoutes,
        padded.entry.inScope,
      ],
    ).toEqual(["Amoxicillin", "CAPSULE", ["ORAL"], true]);
    const nothing = parseNdcRecord(null, rules);
    expect(nothing).toEqual({
      ok: false,
      sourceId: null,
      problems: [expect.stringMatching(/^\(record\): /)],
    });
    const missing = parseNdcRecord(
      { product_ndc: "00000-0009", dosage_form: "TABLET" },
      rules,
    );
    expect(!missing.ok && missing.problems[0]).toMatch(/^generic_name: /);
    const nested = parseNdcRecord(
      { ...tablet, active_ingredients: [{ strength: "5 mg" }] },
      rules,
    );
    expect(!nested.ok && nested.problems[0]).toMatch(
      /^active_ingredients\.0\.name: /,
    );
  });

  it("[ARC-015] merges routes and keeps in-scope only when every merged product is in scope", () => {
    const both = buildCatalog(
      [tablet, { ...tablet, product_ndc: "00000-0007", route: ["SUBLINGUAL"] }],
      rules,
    );
    expect(both.entries.map((e) => [e.routes, e.inScope])).toEqual([
      [["oral", "sublingual"], true],
    ]);
  });

  it("[ARC-015] keeps products apart whose names, strengths or forms only run together", () => {
    const a = {
      ...tablet,
      product_ndc: "A",
      generic_name: "Ab",
      dosage_form: "X",
      active_ingredients: [{ name: "C" }],
    };
    const b = {
      ...tablet,
      product_ndc: "B",
      generic_name: "A",
      dosage_form: "X",
      active_ingredients: [{ name: "bC" }],
    };
    expect(buildCatalog([a, b], rules).entries).toHaveLength(2);
  });
});
