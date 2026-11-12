// SpareWing acceptance tests for synthetic data, from DOC-070.
import { parseIsoDate } from "@church-logistics/core";
import { describe, expect, it } from "vitest";
import {
  AIRCRAFT_ID,
  PART_NUMBER,
  WEEKDAYS,
  generateSpareWing,
} from "../src/sparewing.ts";
import { isSyntheticPersonName } from "../src/words.ts";

const baseDate = parseIsoDate("2026-11-12");

describe("SpareWing synthetic data acceptance", () => {
  it("[TC-312] Given generated SpareWing data, then every part number and aircraft id uses the made-up format and every pilot name comes from the synthetic word lists", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const data = generateSpareWing({ seed, baseDate });
      expect(data.synthetic).toBe(true);
      for (const a of data.aircraft) expect(a.id).toMatch(AIRCRAFT_ID);
      for (const p of data.parts) {
        expect(p.partNumber).toMatch(PART_NUMBER);
        for (const alt of p.alternates) expect(alt).toMatch(PART_NUMBER);
      }
      for (const pilot of data.pilots)
        expect(isSyntheticPersonName(pilot.name), pilot.name).toBe(true);
    }
  });

  it("[DAT-301] includes the gaps the rules must handle: unknown currency or availability, and missing lead times", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) =>
      generateSpareWing({ seed, baseDate, pilots: 10 }),
    );
    expect(
      data.some((d) => d.pilots.some((p) => p.currencyUntil === null)),
    ).toBe(true);
    expect(
      data.some((d) => d.pilots.some((p) => p.availability === null)),
    ).toBe(true);
    expect(
      data.some((d) => d.transferModes.some((t) => t.leadTimeDays === null)),
    ).toBe(true);
    expect(data.some((d) => d.parts.some((p) => !p.serviceable))).toBe(true);
    expect(data.some((d) => d.parts.some((p) => p.alternates.length > 0))).toBe(
      true,
    );
  });

  it("[DAT-301] links every record to a real base, and grounds one aircraft with a disruption", () => {
    const data = generateSpareWing({
      seed: 21,
      baseDate,
      bases: 2,
      aircraft: 3,
      parts: 4,
      pilots: 3,
      communities: 3,
    });
    const bases = new Set(data.bases.map((b) => b.id));
    for (const x of [
      ...data.aircraft,
      ...data.parts,
      ...data.pilots,
      ...data.communities,
    ])
      expect(bases.has(x.baseId)).toBe(true);
    expect(data.transferModes).toHaveLength(2);
    expect(data.aircraft[0]?.status).toBe("grounded");
    expect(data.disruptions).toEqual([
      expect.objectContaining({
        kind: "part",
        subjectId: data.aircraft[0]?.id,
      }),
    ]);
    for (const c of data.communities) {
      expect(c.flightDays).toHaveLength(2);
      for (const d of c.flightDays) expect(WEEKDAYS).toContain(d);
    }
    expect(
      generateSpareWing({ seed: 21, baseDate, aircraft: 0 }).disruptions,
    ).toEqual([]);
  });
});
