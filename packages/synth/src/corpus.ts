/**
 * The synthetic corpus and its held-back third (DAT-001, DAT-002, ARC-016). A corpus is a list of
 * scenarios per product, each generated from its own seed derived from the corpus seed. One third
 * of each product's scenarios is held back by the split seed and sealed.
 *
 * The corpus seed and split seed are kept with the held-back package, never committed: anyone
 * holding them could regenerate the corpus and recover the held-back third from the committed
 * development part.
 */
import { createHash } from "node:crypto";
import type { IsoDate } from "@church-logistics/core";
import type { CatalogEntry } from "./fda.ts";
import { generatePrepped, type PreppedData } from "./prepped.ts";
import { generateSpareWing, type SpareWingData } from "./sparewing.ts";
import { sealManifest, splitHeldBack, type Manifest } from "./split.ts";

export interface Scenario<P extends string, D> {
  readonly id: string;
  readonly product: P;
  readonly data: D;
}
export type PreppedScenario = Scenario<"prepped", PreppedData>;
export type SpareWingScenario = Scenario<"sparewing", SpareWingData>;

export interface CorpusOptions {
  readonly corpusSeed: number;
  readonly splitSeed: number;
  readonly baseDate: IsoDate;
  readonly catalog: readonly CatalogEntry[];
  readonly preppedScenarios: number;
  readonly spareWingScenarios: number;
}

export interface Corpus {
  readonly development: {
    readonly prepped: readonly PreppedScenario[];
    readonly sparewing: readonly SpareWingScenario[];
  };
  readonly heldBack: {
    readonly prepped: readonly PreppedScenario[];
    readonly sparewing: readonly SpareWingScenario[];
  };
  readonly manifest: {
    readonly prepped: Manifest;
    readonly sparewing: Manifest;
  };
}

/** A 32-bit scenario seed derived from the corpus seed; not reversible to the corpus seed. */
export function scenarioSeed(
  corpusSeed: number,
  product: string,
  index: number,
): number {
  const hex = createHash("sha256")
    .update(`${String(corpusSeed)}:${product}:${String(index)}`)
    .digest("hex");
  return Number.parseInt(hex.slice(0, 8), 16);
}

const id = (prefix: string, index: number): string =>
  `${prefix}${String(index).padStart(3, "0")}`;

/** Generates both products' scenarios and sets one third of each aside, sealed. */
export function buildCorpus(options: CorpusOptions): Corpus {
  const { corpusSeed, splitSeed, baseDate, catalog } = options;
  if (corpusSeed === splitSeed)
    throw new RangeError("The split seed must differ from the corpus seed");
  const prepped: PreppedScenario[] = [];
  for (let i = 1; i <= options.preppedScenarios; i += 1)
    prepped.push({
      id: id("P", i),
      product: "prepped",
      data: generatePrepped({
        seed: scenarioSeed(corpusSeed, "prepped", i),
        baseDate,
        catalog,
      }),
    });
  const sparewing: SpareWingScenario[] = [];
  for (let i = 1; i <= options.spareWingScenarios; i += 1)
    sparewing.push({
      id: id("S", i),
      product: "sparewing",
      data: generateSpareWing({
        seed: scenarioSeed(corpusSeed, "sparewing", i),
        baseDate,
      }),
    });
  const p = splitHeldBack(prepped, splitSeed);
  const s = splitHeldBack(sparewing, splitSeed);
  return {
    development: { prepped: p.development, sparewing: s.development },
    heldBack: { prepped: p.heldBack, sparewing: s.heldBack },
    manifest: {
      prepped: sealManifest(p.heldBack),
      sparewing: sealManifest(s.heldBack),
    },
  };
}
