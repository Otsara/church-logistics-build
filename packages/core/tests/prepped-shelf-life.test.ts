// The shelf-life rule file (SYS-102, ARC-004): the minimum days of shelf life at arrival.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readShelfLifeRules } from "../src/prepped/shelf-life.ts";

const real: unknown = JSON.parse(
  readFileSync(
    join(import.meta.dirname, "../../../rules/prepped/shelf-life.json"),
    "utf8",
  ),
);

const file = (data: unknown, overrides: object = {}): unknown => ({
  id: "shelf-life",
  product: "prepped",
  title: "Minimum shelf life at arrival",
  status: "placeholder",
  source: {
    url: "https://example.org/guidance",
    verified_date: null,
    verified_by: null,
  },
  data,
  ...overrides,
});

describe("Shelf-life rule file", () => {
  it("[SYS-102] Given the committed rule file, then the minimum is 365 days at arrival and the source is the WHO medicine-donation guidelines", () => {
    const result = readShelfLifeRules(real);
    expect(result).toEqual({
      ok: true,
      minimumDaysAtArrival: 365,
      status: "placeholder",
      sourceUrl: "https://www.who.int/publications/i/item/9789241501989",
    });
  });

  it("[SYS-102] Given a file without a whole, positive number of days, then it is refused with every problem listed", () => {
    for (const days of [0, -1, 364.5, "365", null]) {
      const result = readShelfLifeRules(
        file({ minimum_days_at_arrival: days }),
      );
      expect(result.ok, String(days)).toBe(false);
    }
    const missing = readShelfLifeRules(file({}));
    expect(missing).toEqual({
      ok: false,
      errors: [
        "data.minimum_days_at_arrival: Invalid input: expected number, received undefined",
      ],
    });
    expect(
      readShelfLifeRules(file({ minimum_days_at_arrival: 365, extra: 1 })).ok,
    ).toBe(false);
    expect(readShelfLifeRules(file({ minimum_days_at_arrival: 1 }))).toEqual({
      ok: true,
      minimumDaysAtArrival: 1,
      status: "placeholder",
      sourceUrl: "https://example.org/guidance",
    });
  });

  it("[SYS-102] Given a file that is not the Prepped shelf-life file, or has no valid envelope, then it is refused", () => {
    const data = { minimum_days_at_arrival: 365 };
    expect(readShelfLifeRules(file(data, { id: "route-scope" }))).toEqual({
      ok: false,
      errors: ['id: must be "shelf-life"'],
    });
    expect(readShelfLifeRules(file(data, { product: "sparewing" }))).toEqual({
      ok: false,
      errors: ['product: must be "prepped"'],
    });
    const noSource = readShelfLifeRules(file(data, { source: undefined }));
    expect(noSource.ok).toBe(false);
  });
});
