// The two SpareWing rule files: ratings per aircraft type and cover bases per community
// (ARC-004, SYS-303, SYS-307, ADR-015). Placeholders citing the synthetic data (OD-005).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  coverBasesFor,
  ratingsForType,
  readAircraftTypeRatings,
  readCoverBases,
} from "../src/sparewing/rule-files.ts";

const load = (name: string): unknown =>
  JSON.parse(
    readFileSync(
      join(import.meta.dirname, `../../../rules/sparewing/${name}.json`),
      "utf8",
    ),
  );

const envelope = (id: string, data: unknown) => ({
  id,
  product: "sparewing",
  title: "t",
  status: "placeholder",
  source: {
    url: "https://example.org/x",
    verified_date: null,
    verified_by: null,
  },
  data,
});

describe("SpareWing rule files", () => {
  it("[TC-325] Given the aircraft-type ratings file, then it is a placeholder citing the synthetic data, each synthetic type requires its rating, and a type not listed requires nothing, which the pilot check shows as data missing", () => {
    const reading = readAircraftTypeRatings(load("aircraft-type-ratings"));
    expect(reading).toMatchObject({
      ok: true,
      status: "placeholder",
      sourceUrl:
        "https://github.com/Otsara/church-logistics-build/blob/main/data/synthetic/development/sparewing.json",
    });
    if (!reading.ok) throw new Error("unreadable");
    for (const type of [
      "Type K1 (synthetic)",
      "Type K2 (synthetic)",
      "Type K3 (synthetic)",
    ]) {
      expect(ratingsForType(reading, type)).toEqual([type]);
    }
    expect(ratingsForType(reading, "Type K9 (synthetic)")).toEqual([]);
    // A name that is a property of every object is not a listed type.
    expect(ratingsForType(reading, "constructor")).toEqual([]);
  });

  it("[TC-325] Given a ratings file with the wrong id, product or data, then every problem is listed and nothing is read", () => {
    expect(readAircraftTypeRatings({})).toMatchObject({ ok: false });
    expect(
      readAircraftTypeRatings(
        envelope("cover-bases", { ratings_by_aircraft_type: {} }),
      ),
    ).toEqual({ ok: false, errors: ['id: must be "aircraft-type-ratings"'] });
    expect(
      readAircraftTypeRatings({
        ...envelope("aircraft-type-ratings", { ratings_by_aircraft_type: {} }),
        product: "prepped",
      }),
    ).toEqual({ ok: false, errors: ['product: must be "sparewing"'] });
    const bad = readAircraftTypeRatings(
      envelope("aircraft-type-ratings", {
        ratings_by_aircraft_type: { "Type K1": [], "Type K2": ["  "] },
      }),
    );
    expect(bad).toMatchObject({ ok: false });
    expect(bad.ok ? [] : bad.errors).toEqual([
      expect.stringMatching(
        /^data\.ratings_by_aircraft_type\.Type K1: /,
      ) as string,
      expect.stringMatching(
        /^data\.ratings_by_aircraft_type\.Type K2\.0: /,
      ) as string,
    ]);
  });

  it("[TC-326] Given the cover-bases file, then it is a placeholder citing the synthetic data, lists every development scenario's communities with the base serving them, and nothing for a community or scenario not listed", () => {
    const reading = readCoverBases(load("cover-bases"));
    expect(reading).toMatchObject({ ok: true, status: "placeholder" });
    if (!reading.ok) throw new Error("unreadable");
    expect(coverBasesFor(reading, "S002", "C01")).toEqual(["B01"]);
    expect(coverBasesFor(reading, "S002", "C06")).toEqual(["B03"]);
    expect(coverBasesFor(reading, "S002", "C99")).toBeNull();
    expect(coverBasesFor(reading, "S999", "C01")).toBeNull();
    expect(coverBasesFor(reading, "constructor", "C01")).toBeNull();
    expect(coverBasesFor(reading, "S002", "constructor")).toBeNull();
    // No held-back scenario is listed (DAT-002).
    const manifest = JSON.parse(
      readFileSync(
        join(
          import.meta.dirname,
          "../../../data/synthetic/held-back-manifest.json",
        ),
        "utf8",
      ),
    ) as { sparewing: { records: readonly { id: string }[] } };
    expect(manifest.sparewing.records.length).toBeGreaterThan(0);
    for (const { id } of manifest.sparewing.records) {
      expect(coverBasesFor(reading, id, "C01"), id).toBeNull();
    }
  });

  it("[TC-326] Given a cover-bases file with the wrong id, product or data, then every problem is listed and nothing is read", () => {
    expect(
      readCoverBases(envelope("aircraft-type-ratings", { scenarios: {} })),
    ).toEqual({ ok: false, errors: ['id: must be "cover-bases"'] });
    expect(
      readCoverBases({
        ...envelope("cover-bases", { scenarios: {} }),
        product: "shared",
      }),
    ).toEqual({ ok: false, errors: ['product: must be "sparewing"'] });
    expect(readCoverBases({ id: 1 })).toMatchObject({ ok: false });
    const bad = readCoverBases(
      envelope("cover-bases", { scenarios: { S1: { C1: [] } }, extra: 1 }),
    );
    expect(bad.ok ? [] : bad.errors).toEqual([
      expect.stringMatching(/^data\.scenarios\.S1\.C1: /) as string,
      expect.stringMatching(/^data: /) as string,
    ]);
  });
});
