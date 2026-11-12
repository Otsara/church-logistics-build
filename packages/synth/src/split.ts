/**
 * The held-back confirmation set (DAT-002, ADR-005). One third of the records is set aside by a
 * separate seed and sealed with SHA-256 fingerprints, so it can be shown never to have changed or
 * been used before the pre-release confirmation run.
 */
import { createHash } from "node:crypto";

export interface Identified {
  readonly id: string;
}

export interface Split<T> {
  readonly development: readonly T[];
  readonly heldBack: readonly T[];
}

export interface Manifest {
  readonly algorithm: "sha256";
  readonly count: number;
  readonly records: readonly { readonly id: string; readonly sha256: string }[];
  readonly setSha256: string;
}

const sha256 = (text: string): string =>
  createHash("sha256").update(text).digest("hex");

/** JSON with object keys sorted, so equal records always give the same text. */
export function canonicalJson(value: unknown): string {
  // JSON.stringify(undefined) gives undefined, not text, so undefined is written as null.
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : 1)); // object keys are unique, so never equal
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

function assertUniqueIds(records: readonly Identified[]): void {
  const seen = new Set<string>();
  for (const { id } of records) {
    if (seen.has(id)) throw new Error(`Duplicate record id: ${id}`);
    seen.add(id);
  }
}

/**
 * Sets aside one third of the records (owner, 2026-11-10), chosen by the split seed. The result
 * depends only on the seed and the record ids, not on the order of the input.
 */
export function splitHeldBack<T extends Identified>(
  records: readonly T[],
  seed: number,
): Split<T> {
  assertUniqueIds(records);
  const key = (id: string): string => sha256(`${String(seed)}:${id}`);
  const ranked = [...records].sort((a, b) => (key(a.id) < key(b.id) ? -1 : 1));
  const heldIds = new Set(
    ranked.slice(0, Math.round(records.length / 3)).map((r) => r.id),
  );
  return {
    development: records.filter((r) => !heldIds.has(r.id)),
    heldBack: records.filter((r) => heldIds.has(r.id)),
  };
}

/** Fingerprints every record and the set as a whole. */
export function sealManifest(records: readonly Identified[]): Manifest {
  assertUniqueIds(records);
  const fingerprints = records
    .map((r) => ({ id: r.id, sha256: sha256(canonicalJson(r)) }))
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  return {
    algorithm: "sha256",
    count: fingerprints.length,
    records: fingerprints,
    setSha256: sha256(canonicalJson(fingerprints)),
  };
}

/** Lists every difference between the records and their manifest; an empty list means sealed. */
export function verifyManifest(
  records: readonly Identified[],
  manifest: Manifest,
): string[] {
  const problems: string[] = [];
  const now = sealManifest(records);
  const expected = new Map(manifest.records.map((r) => [r.id, r.sha256]));
  const actual = new Map(now.records.map((r) => [r.id, r.sha256]));
  for (const [id, hash] of expected) {
    const found = actual.get(id);
    if (found === undefined) problems.push(`missing record ${id}`);
    else if (found !== hash) problems.push(`changed record ${id}`);
  }
  for (const id of actual.keys())
    if (!expected.has(id)) problems.push(`added record ${id}`);
  if (problems.length === 0 && now.setSha256 !== manifest.setSha256)
    problems.push("set fingerprint differs");
  return problems;
}
