import { parseIsoDate } from "@church-logistics/core";
import { describe, expect, it } from "vitest";
import { buildCorpus, scenarioSeed } from "../src/corpus.ts";
import type { CatalogEntry } from "../src/fda.ts";
import { verifyManifest } from "../src/split.ts";

const catalog: CatalogEntry[] = [
  {
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
    controlledBasis:
      "FDA drug directory: no DEA schedule recorded (US scheduling only)",
    classes: ["Penicillin-class Antibacterial"],
  },
];

const options = {
  corpusSeed: 101,
  splitSeed: 202,
  baseDate: parseIsoDate("2026-11-12"),
  catalog,
  preppedScenarios: 9,
  spareWingScenarios: 6,
} as const;

describe("Synthetic corpus", () => {
  it("[TC-025] Given corpus and split seeds, then each product's scenarios are generated from derived seeds, one third of each is held back and sealed, and the same seeds give the same corpus", () => {
    const corpus = buildCorpus(options);
    expect(corpus.heldBack.prepped).toHaveLength(3);
    expect(corpus.development.prepped).toHaveLength(6);
    expect(corpus.heldBack.sparewing).toHaveLength(2);
    expect(corpus.development.sparewing).toHaveLength(4);
    const ids = (list: readonly { id: string }[]): string[] =>
      list.map((r) => r.id);
    expect(
      [
        ...ids(corpus.development.prepped),
        ...ids(corpus.heldBack.prepped),
      ].sort(),
    ).toEqual([
      "P001",
      "P002",
      "P003",
      "P004",
      "P005",
      "P006",
      "P007",
      "P008",
      "P009",
    ]);
    expect(
      [
        ...ids(corpus.development.sparewing),
        ...ids(corpus.heldBack.sparewing),
      ].sort(),
    ).toEqual(["S001", "S002", "S003", "S004", "S005", "S006"]);
    const first = corpus.development.prepped[0];
    expect(first?.product).toBe("prepped");
    expect(first?.data.seed).toBe(
      scenarioSeed(101, "prepped", Number(first?.id.slice(1))),
    );
    expect(corpus.development.sparewing[0]?.product).toBe("sparewing");
    expect(
      verifyManifest(corpus.heldBack.prepped, corpus.manifest.prepped),
    ).toEqual([]);
    expect(
      verifyManifest(corpus.heldBack.sparewing, corpus.manifest.sparewing),
    ).toEqual([]);
    expect(corpus.manifest.prepped.count).toBe(3);
    expect(buildCorpus(options)).toEqual(corpus);
    const other = buildCorpus({ ...options, corpusSeed: 102 });
    expect(other.manifest.prepped.setSha256).not.toBe(
      corpus.manifest.prepped.setSha256,
    );
  });

  it("[TC-025] derives distinct 32-bit scenario seeds and refuses a split seed equal to the corpus seed", () => {
    const seeds = [
      scenarioSeed(101, "prepped", 1),
      scenarioSeed(101, "prepped", 2),
      scenarioSeed(101, "sparewing", 1),
      scenarioSeed(102, "prepped", 1),
    ];
    expect(new Set(seeds).size).toBe(4);
    for (const s of seeds) {
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(2 ** 32);
    }
    expect(scenarioSeed(101, "prepped", 1)).toBe(
      scenarioSeed(101, "prepped", 1),
    );
    expect(() => buildCorpus({ ...options, splitSeed: 101 })).toThrow(
      "The split seed must differ from the corpus seed",
    );
  });
});
