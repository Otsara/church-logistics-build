import { describe, expect, it } from "vitest";
import { buildSnapshotCatalog, snapshotSourceSchema } from "../src/snapshot.ts";
import type { RouteScopeRules } from "../src/fda.ts";

const rules: RouteScopeRules = {
  in_scope: ["oral", "topical"],
  routes: { ORAL: "oral", TOPICAL: "topical" },
  cold_chain_product_types: ["VACCINE"],
  excluded_dosage_forms: ["GAS"],
};

const source = snapshotSourceSchema.parse({
  url: "https://download.open.fda.gov/drug/ndc/drug-ndc-0001-of-0001.json.zip",
  export_date: "2026-11-11",
  downloaded: "2026-11-12",
  licence: "https://open.fda.gov/license/",
  zip_sha256: "a".repeat(64),
  json_sha256: "b".repeat(64),
  records: 5,
});

// Record shapes as openFDA publishes them. Medicine names are real; ids are synthetic.
const product = (
  id: string,
  name: string,
  route: string[],
  extra: object = {},
): object => ({
  product_ndc: id,
  generic_name: name,
  dosage_form: "TABLET",
  route,
  active_ingredients: [{ name: name.toUpperCase(), strength: "5 mg/1" }],
  product_type: "HUMAN OTC DRUG",
  ...extra,
});

describe("Snapshot catalogue", () => {
  it("[TC-130] Given a snapshot, then only in-scope products are kept, sorted, with the source and counts, and a product with any out-of-scope reading is left out", () => {
    const records = [
      product("00000-0003", "Zinc oxide", ["TOPICAL"]),
      product("00000-0001", "Diazepam", ["ORAL"], {
        dea_schedule: "CIV",
        pharm_class: ["Benzodiazepine [EPC]"],
      }),
      product("00000-0002", "Diazepam", ["INTRAVENOUS"]),
      product("00000-0004", "Amlodipine", ["ORAL"], {
        pharm_class: ["Dihydropyridine Calcium Channel Blocker [EPC]"],
      }),
      { product_ndc: "00000-0005" },
    ];
    // A biologic is treated as cold chain and left out (OD-049).
    const withVaccine = buildSnapshotCatalog(
      [
        ...records.slice(0, 4),
        product("00000-0008", "Typhoid vaccine live oral", ["ORAL"], {
          product_type: "VACCINE",
        }),
      ],
      rules,
      source,
    );
    expect(withVaccine.entries.map((e) => e.sourceId)).toEqual([
      "00000-0004",
      "00000-0003",
    ]);
    // A product without a recorded strength sorts after the same name's strengths ("|" sorts after letters).
    const strengthless = buildSnapshotCatalog(
      [
        // Zinc oxide, intravenous diazepam (left out) and amlodipine 5 mg.
        ...[0, 2, 3].map((n) => records[n]),
        {
          product_ndc: "00000-0006",
          generic_name: "Amlodipine",
          dosage_form: "TABLET",
          route: ["ORAL"],
          product_type: "HUMAN OTC DRUG",
        },
        {
          product_ndc: "00000-0007",
          generic_name: "Amlodipine",
          dosage_form: "SOLUTION",
          route: ["ORAL"],
          product_type: "HUMAN OTC DRUG",
        },
      ],
      rules,
      source,
    );
    expect(strengthless.entries.map((e) => [e.sourceId, e.strength])).toEqual([
      ["00000-0004", "AMLODIPINE 5 mg/1"],
      ["00000-0007", null],
      ["00000-0006", null],
      ["00000-0003", "ZINC OXIDE 5 mg/1"],
    ]);
    const catalog = buildSnapshotCatalog(records, rules, source);
    expect(catalog.source).toBe(source);
    expect(catalog.entries.map((e) => e.sourceId)).toEqual([
      "00000-0004",
      "00000-0003",
    ]);
    expect(catalog.entries[0]).not.toHaveProperty("inScope");
    expect(catalog.entries[0]).not.toHaveProperty("scopeReason");
    expect(catalog.counts).toEqual({
      records: 5,
      rejected: 1,
      products: 3,
      outOfScope: 1,
      entries: 2,
      controlled: 0,
      withClass: 1,
    });
    expect(catalog.rejectedIds).toEqual(["00000-0005"]);
  });

  it("[TC-130] counts controlled in-scope entries, sorts by strength and form within a name, and refuses a file whose record count differs from its source", () => {
    const records = [
      product("00000-0002", "Diazepam", ["ORAL"], {
        dea_schedule: "CIV",
        active_ingredients: [{ name: "DIAZEPAM", strength: "5 mg/1" }],
      }),
      product("00000-0001", "Diazepam", ["ORAL"], {
        dea_schedule: "CIV",
        active_ingredients: [{ name: "DIAZEPAM", strength: "10 mg/1" }],
      }),
      product("00000-0004", "Diazepam", ["ORAL"], { dosage_form: "SOLUTION" }),
      product("00000-0003", "Diazepam", ["ORAL"], {
        dosage_form: "SOLUTION",
        product_ndc: "00000-0003",
        active_ingredients: [{ name: "DIAZEPAM", strength: "5 mg/1" }],
        generic_name: "DIAZEPAM",
      }),
      product("00000-0005", "Diazepam", ["ORAL"], {
        dosage_form: "SOLUTION",
        active_ingredients: [{ name: "DIAZEPAM", strength: "5 mg/1" }],
        generic_name: "diazepam ",
      }),
    ];
    const catalog = buildSnapshotCatalog(records, rules, source);
    expect(catalog.entries.map((e) => [e.sourceId, e.otherSourceIds])).toEqual([
      ["00000-0001", []],
      ["00000-0004", ["00000-0003", "00000-0005"]],
      ["00000-0002", []],
    ]);
    expect(catalog.counts.controlled).toBe(2);
    expect(catalog.counts.withClass).toBe(0);
    expect(() => buildSnapshotCatalog(records.slice(1), rules, source)).toThrow(
      "Snapshot has 4 records; the source lists 5",
    );
  });

  it("[TC-130] Given a source description with a malformed fingerprint or date, then it is refused", () => {
    expect(
      snapshotSourceSchema.safeParse({ ...source, zip_sha256: "abc" }).success,
    ).toBe(false);
    for (const bad of [
      "a".repeat(65),
      `x${"a".repeat(64)}`,
      `${"a".repeat(64)}x`,
    ])
      expect(
        snapshotSourceSchema.safeParse({ ...source, json_sha256: bad }).success,
        bad,
      ).toBe(false);
    expect(
      snapshotSourceSchema.safeParse({ ...source, export_date: "x2026-11-11" })
        .success,
    ).toBe(false);
    expect(
      snapshotSourceSchema.safeParse({ ...source, export_date: "11/11/2026" })
        .success,
    ).toBe(false);
    expect(
      snapshotSourceSchema.safeParse({
        ...source,
        json_sha256: `x${"b".repeat(63)}`,
      }).success,
    ).toBe(false);
    expect(
      snapshotSourceSchema.safeParse({ ...source, downloaded: "2026-11-12x" })
        .success,
    ).toBe(false);
  });
});
