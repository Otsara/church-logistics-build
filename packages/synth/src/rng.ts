/**
 * Seeded pseudo-random numbers for synthetic data (ARC-012, DAT-001). The same seed always gives
 * the same sequence. Not for security or cryptography.
 */

export interface Rng {
  /** A number from 0 (inclusive) to 1 (exclusive). */
  next(): number;
  /** A whole number from min to max, both inclusive. */
  int(min: number, max: number): number;
  /** One element of a non-empty list. */
  pick<T>(items: readonly T[]): T;
  /** True with the given probability (0 to 1). */
  chance(probability: number): boolean;
}

const UINT32 = 0x100000000;

/** Creates a generator from a seed: any whole number from 0 to 4294967295. */
export function createRng(seed: number): Rng {
  if (!Number.isInteger(seed) || seed < 0 || seed >= UINT32) {
    throw new RangeError(
      `Seed must be a whole number from 0 to 4294967295, not ${String(seed)}`,
    );
  }
  let state = seed;
  const next = (): number => {
    // A Weyl sequence passed through a 32-bit avalanche mix.
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    z = (z ^ (z >>> 16)) >>> 0;
    return z / UINT32;
  };
  const int = (min: number, max: number): number => {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new RangeError(
        `int() needs whole numbers with min <= max, not ${String(min)}..${String(max)}`,
      );
    }
    return min + Math.floor(next() * (max - min + 1));
  };
  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0)
      throw new RangeError("pick() needs a non-empty list");
    return items[int(0, items.length - 1)] as T;
  };
  const chance = (probability: number): boolean => next() < probability;
  return { next, int, pick, chance };
}
