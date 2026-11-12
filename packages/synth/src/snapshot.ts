/**
 * The frozen Prepped medicine catalogue built from one dated FDA drug directory snapshot
 * (DAT-101, ARC-018; OD-034). Safety-critical: only products whose every reading is in scope are
 * kept, so the catalogue never offers a product the route rules would block (SYS-109).
 */
import { z } from "zod";
import {
  buildCatalog,
  type CatalogEntry,
  type RouteScopeRules,
} from "./fda.ts";

const SHA256 = /^[0-9a-f]{64}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Where the snapshot came from; committed as data/fda/source.json. */
export const snapshotSourceSchema = z.strictObject({
  url: z.url(),
  export_date: z.string().regex(DATE),
  downloaded: z.string().regex(DATE),
  licence: z.url(),
  zip_sha256: z.string().regex(SHA256),
  json_sha256: z.string().regex(SHA256),
  records: z.number().int().positive(),
});
export type SnapshotSource = z.infer<typeof snapshotSourceSchema>;

export interface SnapshotCatalog {
  readonly source: SnapshotSource;
  readonly counts: {
    readonly records: number;
    readonly rejected: number;
    readonly products: number;
    readonly outOfScope: number;
    readonly entries: number;
    readonly controlled: number;
    readonly withClass: number;
  };
  /** Rejected record ids, kept for review. */
  readonly rejectedIds: readonly (string | null)[];
  /** In-scope entries only (OD-034), sorted by generic name, strength, form and source id. */
  readonly entries: readonly SnapshotEntry[];
}

/** A catalogue entry as stored: every entry is in scope, so scope fields are not kept. */
export type SnapshotEntry = Omit<CatalogEntry, "inScope" | "scopeReason">;

/**
 * Builds the catalogue from the snapshot's records. The record count must match the source,
 * so a truncated or different file is refused rather than imported.
 */
export function buildSnapshotCatalog(
  records: readonly unknown[],
  rules: RouteScopeRules,
  source: SnapshotSource,
): SnapshotCatalog {
  if (records.length !== source.records)
    throw new Error(
      `Snapshot has ${String(records.length)} records; the source lists ${String(source.records)}`,
    );
  const catalog = buildCatalog(records, rules);
  const key = (e: CatalogEntry): string =>
    [e.genericName, e.strength ?? "", e.dosageForm, e.sourceId].join("|");
  const entries = catalog.entries
    .filter((e) => e.inScope)
    .sort((a, b) => (key(a) < key(b) ? -1 : 1))
    .map((e): SnapshotEntry => ({
      sourceId: e.sourceId,
      otherSourceIds: e.otherSourceIds,
      genericName: e.genericName,
      dosageForm: e.dosageForm,
      strength: e.strength,
      fdaRoutes: e.fdaRoutes,
      routes: e.routes,
      controlled: e.controlled,
      controlledBasis: e.controlledBasis,
      classes: e.classes,
    }));
  return {
    source,
    counts: {
      records: records.length,
      rejected: catalog.rejected.length,
      products: catalog.entries.length,
      outOfScope: catalog.entries.length - entries.length,
      entries: entries.length,
      controlled: entries.filter((e) => e.controlled === "yes").length,
      withClass: entries.filter((e) => e.classes.length > 0).length,
    },
    rejectedIds: catalog.rejected.map((r) => r.sourceId),
    entries,
  };
}
