/**
 * Checks the data scripts rely on (ARC-018, DAT-002), kept here so they are tested: the snapshot
 * must be the exact file recorded in data/fda/source.json, the route rule file must be verified by
 * the owner, and the held-back package must never be written inside the repository.
 */
import { createHash } from "node:crypto";
import { relative, resolve } from "node:path";
import { parseRuleFile } from "@church-logistics/core";
import { routeScopeSchema, type RouteScopeRules } from "./fda.ts";
import type { SnapshotSource } from "./snapshot.ts";

/** The snapshot's records, only if the file's SHA-256 and export date match its source. */
export function readSnapshot(bytes: Buffer, source: SnapshotSource): unknown[] {
  const fingerprint = createHash("sha256").update(bytes).digest("hex");
  if (fingerprint !== source.json_sha256)
    throw new Error(
      `Snapshot fingerprint ${fingerprint} does not match data/fda/source.json`,
    );
  const snapshot = JSON.parse(bytes.toString("utf8")) as {
    meta?: { last_updated?: unknown };
    results?: unknown;
  };
  const exported = snapshot.meta?.last_updated;
  if (exported !== source.export_date)
    throw new Error(
      `Snapshot export date ${String(exported)} does not match ${source.export_date}`,
    );
  if (!Array.isArray(snapshot.results))
    throw new Error("Snapshot has no results list");
  return snapshot.results as unknown[];
}

/** The route rules, only from a valid rule file the owner has verified. */
export function verifiedRouteScope(raw: unknown): RouteScopeRules {
  const file = parseRuleFile(raw);
  if (!file.ok) throw new Error(file.errors.join("\n"));
  if (file.file.status !== "verified")
    throw new Error("rules/prepped/route-scope.json is not verified");
  return routeScopeSchema.parse(file.file.data);
}

/** Refuses any path inside the repository root, including the root itself. */
export function assertOutsideRoot(path: string, root: string): void {
  const rel = relative(resolve(root), resolve(path));
  if (!rel.startsWith(".."))
    throw new Error(
      "The held-back package must be written outside the repository",
    );
}
