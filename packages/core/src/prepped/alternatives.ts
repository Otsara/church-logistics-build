/**
 * Comparable alternatives for a floor item (ARC-101; safety-critical; SYS-108, ADR-003, RC-105).
 * Other eligible lots that share an established pharmacologic class (EPC) with the floor item
 * are listed for the clinician to consider, each labelled "Comparable, not equivalent: clinician
 * review required" with its class and the class's source (ADR-014). Nothing here counts toward
 * the floor item or substitutes for it: listing an alternative changes no coverage (HAZ-105).
 * The same medicine in another form or strength is an exchange, not an alternative (SYS-115).
 */
import type { StockLot } from "./floor.ts";

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
    if (sharedClasses.length === 0) continue;
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
