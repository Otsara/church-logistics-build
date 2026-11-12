// Shared acceptance tests for synthetic data, from DOC-070.
import { parseIsoDate } from "@church-logistics/core";
import { describe, expect, it } from "vitest";
import type { CatalogEntry } from "../src/fda.ts";
import { generatePrepped } from "../src/prepped.ts";
import { generateSpareWing } from "../src/sparewing.ts";

const baseDate = parseIsoDate("2026-11-12");
const entry = (sourceId: string, genericName: string): CatalogEntry => ({
  sourceId,
  otherSourceIds: [],
  genericName,
  dosageForm: "TABLET",
  strength: `${genericName.toUpperCase()} 100 mg/1`,
  fdaRoutes: ["ORAL"],
  routes: ["oral"],
  inScope: true,
  scopeReason: null,
  controlled: "no",
});
export const catalog = [
  entry("00000-0101", "Paracetamol"),
  entry("00000-0102", "Ibuprofen"),
  entry("00000-0103", "Amoxicillin"),
];

describe("Synthetic data acceptance", () => {
  it("[TC-005] Given the same seed, then the synthetic data generator produces identical data", () => {
    const prepped = generatePrepped({ seed: 11, baseDate, catalog });
    expect(generatePrepped({ seed: 11, baseDate, catalog })).toEqual(prepped);
    expect(generatePrepped({ seed: 12, baseDate, catalog })).not.toEqual(
      prepped,
    );
    const sparewing = generateSpareWing({ seed: 11, baseDate });
    expect(generateSpareWing({ seed: 11, baseDate })).toEqual(sparewing);
    expect(generateSpareWing({ seed: 12, baseDate })).not.toEqual(sparewing);
  });
});
