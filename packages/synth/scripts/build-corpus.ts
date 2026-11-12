/**
 * Builds the synthetic corpus, commits its development two thirds, and writes the held-back third
 * as a package for the owner to keep (DAT-001, DAT-002, ARC-016; OD-036).
 * Usage: node packages/synth/scripts/build-corpus.ts <held-back package path outside the repo>
 *
 * The seeds are drawn at random and written only into the held-back package. Nothing from the
 * held-back third, and neither seed, is printed or written inside the repository.
 */
import { execFileSync } from "node:child_process";
import { randomInt } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { parseIsoDate } from "@church-logistics/core";
import { buildCorpus } from "../src/corpus.ts";
import type { CatalogEntry } from "../src/fda.ts";
import { ROOT, linedJson, sha256 } from "./io.ts";

const BASE_DATE = parseIsoDate("2026-11-12");
const SCENARIOS = 30; // per product; 10 of each are held back
const CATALOG = "data/fda/catalog-2026-11-11.json";

const [target] = process.argv.slice(2);
if (target === undefined)
  throw new Error("Give the path for the held-back package");
const packagePath = resolve(target);
if (!relative(ROOT, packagePath).startsWith(".."))
  throw new Error(
    "The held-back package must be written outside the repository",
  );

const catalogText = readFileSync(join(ROOT, CATALOG), "utf8");
const catalog = (
  JSON.parse(catalogText) as {
    entries: Omit<CatalogEntry, "inScope" | "scopeReason">[];
  }
).entries.map((e): CatalogEntry => ({
  ...e,
  inScope: true,
  scopeReason: null,
}));
const corpusSeed = randomInt(0, 2 ** 32);
let splitSeed = randomInt(0, 2 ** 32);
while (splitSeed === corpusSeed) splitSeed = randomInt(0, 2 ** 32);
const corpus = buildCorpus({
  corpusSeed,
  splitSeed,
  baseDate: BASE_DATE,
  catalog,
  preppedScenarios: SCENARIOS,
  spareWingScenarios: SCENARIOS,
});
const commit = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: ROOT,
  encoding: "utf8",
}).trim();
const common = {
  synthetic: true,
  baseDate: BASE_DATE,
  generatorCommit: commit,
  catalog: { file: CATALOG, sha256: sha256(catalogText) },
};

const heldBackPackage = `${JSON.stringify(
  {
    warning:
      "HELD-BACK CONFIRMATION SET (DAT-002). Do not open, read or use except at the pre-release confirmation run with the owner present.",
    ...common,
    corpusSeed,
    splitSeed,
    scenariosPerProduct: SCENARIOS,
    prepped: corpus.heldBack.prepped,
    sparewing: corpus.heldBack.sparewing,
  },
  null,
  1,
)}\n`;
mkdirSync(dirname(packagePath), { recursive: true });
writeFileSync(packagePath, heldBackPackage);

const dev = join(ROOT, "data/synthetic/development");
mkdirSync(dev, { recursive: true });
writeFileSync(
  join(dev, "prepped.json"),
  linedJson(common, "scenarios", corpus.development.prepped),
);
writeFileSync(
  join(dev, "sparewing.json"),
  linedJson(common, "scenarios", corpus.development.sparewing),
);
writeFileSync(
  join(ROOT, "data/synthetic/held-back-manifest.json"),
  `${JSON.stringify(
    {
      ...common,
      scenariosPerProduct: SCENARIOS,
      packageSha256: sha256(heldBackPackage),
      custody: "Held by the owner in the owner's own private storage (OD-036)",
      prepped: corpus.manifest.prepped,
      sparewing: corpus.manifest.sparewing,
    },
    null,
    2,
  )}\n`,
);
process.stdout.write(
  `${JSON.stringify({
    development: {
      prepped: corpus.development.prepped.length,
      sparewing: corpus.development.sparewing.length,
    },
    heldBack: {
      prepped: corpus.manifest.prepped.count,
      sparewing: corpus.manifest.sparewing.count,
    },
    packageSha256: sha256(heldBackPackage),
  })}\n`,
);
