import { describe, expect, it } from "vitest";
import { createRng } from "../src/rng.ts";
import {
  FIRST_NAMES,
  inventedWord,
  isSyntheticPersonName,
  personName,
} from "../src/words.ts";
import { addDays } from "../src/dates.ts";
import { parseIsoDate } from "@church-logistics/core";

describe("seeded random numbers", () => {
  it("[ARC-012] gives the same sequence for the same seed and a different one for another seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const c = createRng(43);
    const seqA = [a.next(), a.next(), a.next()];
    expect([b.next(), b.next(), b.next()]).toEqual(seqA);
    expect([c.next(), c.next(), c.next()]).not.toEqual(seqA);
  });

  it("[ARC-012] keeps numbers in range and int() within both bounds", () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i += 1) {
      const x = rng.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      const n = rng.int(2, 4);
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(4);
      seen.add(n);
    }
    expect([...seen].sort()).toEqual([2, 3, 4]);
    expect(rng.int(5, 5)).toBe(5);
  });

  it("[ARC-012] rejects bad seeds, bad bounds and empty lists", () => {
    for (const seed of [-1, 1.5, 2 ** 32, Number.NaN])
      expect(() => createRng(seed)).toThrow(RangeError);
    const rng = createRng(1);
    expect(() => rng.int(3, 2)).toThrow(RangeError);
    expect(() => rng.int(0.5, 2)).toThrow(RangeError);
    expect(() => rng.pick([])).toThrow("non-empty");
  });

  it("[ARC-012] chance() is never true at 0 and always true at 1", () => {
    const rng = createRng(9);
    for (let i = 0; i < 50; i += 1) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
    }
  });
});

describe("synthetic names", () => {
  it("[DAT-003] builds person names from the word lists, and recognises only those", () => {
    const rng = createRng(3);
    for (let i = 0; i < 100; i += 1) {
      const name = personName(rng);
      expect(isSyntheticPersonName(name), name).toBe(true);
      expect(FIRST_NAMES).toContain(name.split(" ")[0]);
    }
    for (const name of [
      "John Smith",
      "Alder",
      "Alder Kalo Ven",
      "Alder kalo",
      "Alder Ka",
      "Alder Kalovendrimo",
    ]) {
      expect(isSyntheticPersonName(name), name).toBe(false);
    }
    expect(inventedWord(createRng(5))).toMatch(/^[A-Z][a-z]+$/);
  });
});

describe("synthetic dates", () => {
  it("[ARC-005] adds and subtracts whole days across month and year ends", () => {
    expect(addDays(parseIsoDate("2026-12-30"), 3)).toBe("2027-01-02");
    expect(addDays(parseIsoDate("2028-03-01"), -1)).toBe("2028-02-29");
    expect(addDays(parseIsoDate("2026-11-12"), 0)).toBe("2026-11-12");
  });
});
