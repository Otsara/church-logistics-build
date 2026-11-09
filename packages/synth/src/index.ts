/**
 * Seeded synthetic data (F-12, X-5). The same seed always gives the same data.
 * Synthetic data only: no real names, records or secrets (CLAUDE.md rule 4).
 *
 * This file fixes the interface only; the synthetic data stream builds the generator.
 */

export interface SynthOptions {
  /** Any 32-bit unsigned integer. */
  readonly seed: number;
}

/** A generator for one kind of synthetic record set, for example Prepped lots and trips. */
export type Generate<Data> = (options: SynthOptions) => Data;
