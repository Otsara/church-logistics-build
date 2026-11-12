import { daysBetween, parseIsoDate } from "@church-logistics/core";
import { describe, expect, it } from "vitest";
import { generatePrepped } from "../src/prepped.ts";
import { catalog } from "./shared.acceptance.test.ts";

const baseDate = parseIsoDate("2026-11-12");

describe("synthetic Prepped data", () => {
  it("[DAT-101] builds donors, lots, trips and floor items from the catalog, marked synthetic", () => {
    const data = generatePrepped({
      seed: 5,
      baseDate,
      catalog,
      donors: 2,
      lots: 25,
      trips: 2,
      floorItemsPerTrip: 5,
    });
    expect(data.synthetic).toBe(true);
    expect(data.donors).toHaveLength(2);
    expect(data.lots).toHaveLength(25);
    expect(data.trips).toHaveLength(2);
    expect(data.donors.every((d) => d.name.startsWith("Synthetic "))).toBe(
      true,
    );
    const ids = new Set(catalog.map((c) => c.sourceId));
    for (const lot of data.lots) {
      expect(ids.has(lot.catalogSourceId)).toBe(true);
      expect(data.donors.some((d) => d.id === lot.donorId)).toBe(true);
      expect(lot.lotNumber).toMatch(/^L\d{6}$/);
      expect(daysBetween(baseDate, lot.expiry)).toBeGreaterThanOrEqual(-60);
      expect(daysBetween(baseDate, lot.expiry)).toBeLessThanOrEqual(900);
      expect(lot.sourceLine).toContain(lot.lotNumber);
    }
    for (const trip of data.trips) {
      const items = data.floorItems.filter((f) => f.tripId === trip.id);
      expect(items.length).toBeGreaterThan(0);
      expect(new Set(items.map((i) => i.catalogSourceId)).size).toBe(
        items.length,
      );
    }
  });

  it("[DAT-101] never picks more floor items than the catalog holds, and needs a catalog", () => {
    const data = generatePrepped({
      seed: 9,
      baseDate,
      catalog,
      trips: 1,
      floorItemsPerTrip: 50,
    });
    expect(data.floorItems.length).toBeLessThanOrEqual(catalog.length);
    expect(() => generatePrepped({ seed: 9, baseDate, catalog: [] })).toThrow(
      "at least one catalog entry",
    );
    expect(generatePrepped({ seed: 1, baseDate, catalog }).lots).toHaveLength(
      40,
    );
  });

  it("[DAT-101] writes a clean source line when a product has no recorded strength", () => {
    const strengthless = catalog.map((c) => ({ ...c, strength: null }));
    const lots = generatePrepped({
      seed: 2,
      baseDate,
      catalog: strengthless,
      lots: 3,
    }).lots;
    for (const lot of lots) expect(lot.sourceLine).not.toMatch(/\s{2}/);
  });
});
