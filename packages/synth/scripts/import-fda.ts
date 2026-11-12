/**
 * Imports the frozen FDA drug directory snapshot into data/fda (DAT-101, ARC-018; OD-034).
 * Usage: node packages/synth/scripts/import-fda.ts <extracted drug-ndc JSON file>
 * The file must match the fingerprint and record count in data/fda/source.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildSnapshotCatalog, snapshotSourceSchema } from "../src/snapshot.ts";
import { readSnapshot, verifiedRouteScope } from "../src/data-checks.ts";
import { ROOT, linedJson } from "./io.ts";

const [input] = process.argv.slice(2);
if (input === undefined)
  throw new Error("Give the extracted snapshot JSON file");
const source = snapshotSourceSchema.parse(
  JSON.parse(readFileSync(join(ROOT, "data/fda/source.json"), "utf8")),
);
const rules = verifiedRouteScope(
  JSON.parse(
    readFileSync(join(ROOT, "rules/prepped/route-scope.json"), "utf8"),
  ),
);
const records = readSnapshot(readFileSync(input), source);
const catalog = buildSnapshotCatalog(records, rules, source);
const out = join(ROOT, `data/fda/catalog-${source.export_date}.json`);
const { entries, ...head } = catalog;
writeFileSync(out, linedJson({ ...head }, "entries", entries));
process.stdout.write(`${JSON.stringify(catalog.counts)}\n`);
