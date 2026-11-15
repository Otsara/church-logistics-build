/**
 * Comparable alternatives for a floor item (ARC-101; safety-critical; SYS-108, ADR-003, RC-105).
 * Other eligible lots that share an established pharmacologic class (EPC) with the floor item
 * are listed for the clinician to consider, each labelled "Comparable, not equivalent: clinician
 * review required" with its class and the class's source (ADR-014). Nothing here counts toward
 * the floor item or substitutes for it: listing an alternative changes no coverage (HAZ-105).
 * The same medicine in another form or strength is an exchange, not an alternative (SYS-115).
 * An alternative brings no class the floor item lacks, so a combination product that adds another
 * medicine is not offered for a single agent (owner, 2026-11-15; ADR-028).
 */
import type { FloorAssessment, StockLot } from "./floor.ts";

export const COMPARABLE_LABEL =
  "Comparable, not equivalent: clinician review required";
export const CLASS_SOURCE =
  "FDA drug directory: established pharmacologic class (EPC)";

/** A stock lot with its catalogue entry's EPC classes. */
export interface ClassedLot extends StockLot {
  readonly classes: readonly string[];
}

export interface ItemForAlternatives {
  readonly id: string;
  readonly catalogEntryId: string;
  readonly genericName: string;
  /** The floor item's catalogue entry's EPC classes. */
  readonly classes: readonly string[];
}

export interface Alternative {
  readonly lotId: string;
  readonly donorId: string;
  readonly manufacturer: string | null;
  readonly genericName: string;
  readonly strength: string | null;
  readonly dosageForm: string;
  readonly quantity: number;
  readonly sharedClasses: readonly string[];
  readonly label: typeof COMPARABLE_LABEL;
  readonly classSource: typeof CLASS_SOURCE;
}

export interface AlternativesResult {
  readonly floorItemId: string;
  readonly alternatives: readonly Alternative[];
  /** Why the list is empty, when it is. */
  readonly note: string | null;
}

const sameName = (a: string, b: string): boolean =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/** Lists comparable alternatives for one floor item. Never throws; counts nothing. */
export function comparableAlternatives(
  item: ItemForAlternatives,
  lots: readonly ClassedLot[],
): AlternativesResult {
  if (item.classes.length === 0) {
    return {
      floorItemId: item.id,
      alternatives: [],
      note: "no established pharmacologic class recorded in the FDA drug directory: no comparable alternatives can be offered",
    };
  }
  const alternatives: Alternative[] = [];
  for (const lot of lots) {
    if (lot.eligibility.status !== "eligible") continue;
    if (sameName(lot.genericName, item.genericName)) continue;
    const sharedClasses = lot.classes.filter((c) => item.classes.includes(c));
    // Shares a class, and every class it has is one the floor item has (owner, 2026-11-15).
    if (sharedClasses.length === 0 || sharedClasses.length < lot.classes.length)
      continue;
    alternatives.push({
      lotId: lot.lotId,
      donorId: lot.donorId,
      manufacturer: lot.manufacturer,
      genericName: lot.genericName,
      strength: lot.strength,
      dosageForm: lot.dosageForm,
      quantity: lot.quantity,
      sharedClasses,
      label: COMPARABLE_LABEL,
      classSource: CLASS_SOURCE,
    });
  }
  return {
    floorItemId: item.id,
    alternatives,
    note:
      alternatives.length > 0
        ? null
        : `no eligible lot of another medicine in the same class (${item.classes.join(", ")})`,
  };
}

/**
 * Alternatives for every floor item, so the clinician can browse early; those of an item that is
 * short or needs review are marked as offered (owner, 2026-11-15). Nothing here counts.
 */
export function alternativesForFloor(
  items: readonly ItemForAlternatives[],
  lots: readonly ClassedLot[],
  assessment: FloorAssessment,
): (AlternativesResult & { readonly offered: boolean })[] {
  return items.map((item) => {
    const coverage = assessment.items.find((i) => i.floorItemId === item.id);
    return {
      ...comparableAlternatives(item, lots),
      offered: coverage !== undefined && coverage.status !== "covered",
    };
  });
}
