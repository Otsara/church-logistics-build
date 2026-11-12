/**
 * Imports the frozen FDA drug directory snapshot into data/fda (DAT-101, ARC-018; OD-034).
 * Usage: node packages/synth/scripts/import-fda.ts <extracted drug-ndc JSON file>
 * The file must match the fingerprint and record count in data/fda/source.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildSnapshotCatalog, snapshotSourceSchema } from "../src/snapshot.ts";
import { ROOT, linedJson, readRouteScope, sha256 } from "./io.ts";

const [input] = process.argv.slice(2);
if (input === undefined)
  throw new Error("Give the extracted snapshot JSON file");
const source = snapshotSourceSchema.parse(
  JSON.parse(readFileSync(join(ROOT, "data/fda/source.json"), "utf8")),
);
const bytes = readFileSync(input);
const fingerprint = sha256(bytes);
if (fingerprint !== source.json_sha256)
  throw new Error(
    `Snapshot fingerprint ${fingerprint} does not match data/fda/source.json`,
  );
const snapshot = JSON.parse(bytes.toString("utf8")) as {
  meta?: { last_updated?: string };
  results: unknown[];
};
if (snapshot.meta?.last_updated !== source.export_date)
  throw new Error(
    `Snapshot export date ${String(snapshot.meta?.last_updated)} does not match ${source.export_date}`,
  );
const catalog = buildSnapshotCatalog(
  snapshot.results,
  readRouteScope(),
  source,
);
const out = join(ROOT, `data/fda/catalog-${source.export_date}.json`);
const { entries, ...head } = catalog;
writeFileSync(out, linedJson({ ...head }, "entries", entries));
process.stdout.write(`${JSON.stringify(catalog.counts)}\n`);
