import { createHash } from "node:crypto";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertOutsideRoot,
  readSnapshot,
  verifiedRouteScope,
} from "../src/data-checks.ts";
import { snapshotSourceSchema } from "../src/snapshot.ts";

const sha = (text: string): string =>
  createHash("sha256").update(text).digest("hex");

const file = JSON.stringify({
  meta: { last_updated: "2026-11-11" },
  results: [{ product_ndc: "00000-0001" }, { product_ndc: "00000-0002" }],
});
const source = snapshotSourceSchema.parse({
  url: "https://download.open.fda.gov/drug/ndc/drug-ndc-0001-of-0001.json.zip",
  export_date: "2026-11-11",
  downloaded: "2026-11-12",
  licence: "https://open.fda.gov/license/",
  zip_sha256: "a".repeat(64),
  json_sha256: sha(file),
  records: 2,
});

const rules = {
  id: "route-scope",
  product: "prepped",
  title: "Routes",
  status: "verified",
  source: {
    url: "https://www.fda.gov/",
    verified_date: "2026-11-12",
    verified_by: "owner",
  },
  data: {
    in_scope: ["oral"],
    routes: { ORAL: "oral" },
    cold_chain_product_types: ["VACCINE"],
    excluded_dosage_forms: ["GAS"],
  },
};

describe("Data script checks", () => {
  it("[TC-027] Given the snapshot file, then it is read only when its fingerprint and export date match the source", () => {
    expect(readSnapshot(Buffer.from(file), source)).toEqual([
      { product_ndc: "00000-0001" },
      { product_ndc: "00000-0002" },
    ]);
    expect(() => readSnapshot(Buffer.from(`${file} `), source)).toThrow(
      /^Snapshot fingerprint [0-9a-f]{64} does not match data\/fda\/source\.json$/,
    );
    const otherDate = JSON.stringify({
      meta: { last_updated: "2026-11-10" },
      results: [],
    });
    expect(() =>
      readSnapshot(Buffer.from(otherDate), {
        ...source,
        json_sha256: sha(otherDate),
      }),
    ).toThrow("Snapshot export date 2026-11-10 does not match 2026-11-11");
    const noMeta = JSON.stringify({ results: [] });
    expect(() =>
      readSnapshot(Buffer.from(noMeta), {
        ...source,
        json_sha256: sha(noMeta),
      }),
    ).toThrow("Snapshot export date undefined does not match 2026-11-11");
    const noResults = JSON.stringify({ meta: { last_updated: "2026-11-11" } });
    expect(() =>
      readSnapshot(Buffer.from(noResults), {
        ...source,
        json_sha256: sha(noResults),
      }),
    ).toThrow("Snapshot has no results list");
  });

  it("[TC-027] Given the route rule file, then it is used only when it is valid and verified", () => {
    expect(verifiedRouteScope(rules)).toEqual(rules.data);
    expect(() =>
      verifiedRouteScope({
        ...rules,
        status: "placeholder",
        source: { ...rules.source, verified_date: null, verified_by: null },
      }),
    ).toThrow("rules/prepped/route-scope.json is not verified");
    expect(() =>
      verifiedRouteScope({ ...rules, source: { url: "x" } }),
    ).toThrow();
    // Every problem with a malformed file is listed, one per line.
    expect(() => verifiedRouteScope({ ...rules, id: "", title: "" })).toThrow(
      /\n/,
    );
    expect(() =>
      verifiedRouteScope({ ...rules, data: { ...rules.data, extra: 1 } }),
    ).toThrow();
  });

  it("[TC-027] Given a path for the held-back package, then any path inside the repository is refused", () => {
    const root = "/work/repo";
    expect(() => {
      assertOutsideRoot("/work/elsewhere/held.json", root);
    }).not.toThrow();
    expect(() => {
      assertOutsideRoot("/work/repo-other/held.json", root);
    }).not.toThrow();
    for (const outside of ["/work", "/elsewhere/held.json"])
      expect(() => {
        assertOutsideRoot(outside, root);
      }, outside).not.toThrow();
    for (const inside of [
      "/work/repo/held.json",
      // A folder inside the repository whose name starts with two dots (REV-002).
      "/work/repo/..held/x.json",
      "/work/repo/...x",
      "/work/repo/data/held.json",
      join(root, "a", "..", "held.json"),
      root,
    ])
      expect(() => {
        assertOutsideRoot(inside, root);
      }, inside).toThrow(
        "The held-back package must be written outside the repository",
      );
  });
});
