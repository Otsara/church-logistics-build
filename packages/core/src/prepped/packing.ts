/**
 * Building the packing list from the team's stock (ARC-101; SYS-121; TC-140, TC-141;
 * safety-critical). The screens never choose the lines (CLAUDE.md rule 2). After the owner's review
 * (owner, 2026-11-18; REV-014, ADR-049):
 *
 * - For a floor item, its own medicine is packed soonest expiry first, only as much as the target
 *   needs after what accepted exchanges and chosen alternatives cover; the last lot may be packed in
 *   part, and the rest of it stays in stock for another brigade.
 * - Exchanges and alternatives are packed only at the amount the lead clinician enters, in the lot's
 *   own units: the app never converts doses (SYS-115). Until it is entered, the list has a problem.
 * - Supplements are packed at the amount the lead clinician enters (SYS-114).
 * - The lead clinician may change any floor line's amount, from 1 to what remains in the lot.
 * - Stock is shared by the team's trips: a lot's available amount is its quantity less what other
 *   trips' signed-off packing lists take. Lists that together take more than a lot holds, as after
 *   two trips signed off offline, put the lot in conflict: it counts for neither until a person
 *   resolves it (OD-017).
 *
 * A packing list with any problem cannot be signed off (`sign-off.ts`). Never throws.
 */
import { lotName, type FloorAssessment, type StockLot } from "./floor.ts";
import type { PackingLine } from "./sign-off.ts";

/** An amount to pack from an exchange or alternative lot, entered by the lead clinician. */
export interface PackAmount {
  readonly floorItemId: string;
  readonly lotId: string;
  readonly quantity: number;
}

/** A supplement: an eligible lot and the amount the lead clinician enters. */
export interface SupplementLine {
  readonly lotId: string;
  readonly quantity: number;
}

/** The lead clinician's change to the amount packed from one of a floor item's own lots. */
export interface Adjustment {
  readonly floorItemId: string;
  readonly lotId: string;
  readonly quantity: number;
}

export interface PackingInput {
  /** The floor assessment, made with the stock available to this trip. */
  readonly assessment: FloorAssessment;
  /** The stock available to this trip (`availableStock`), checked for eligibility. */
  readonly lots: readonly StockLot[];
  readonly packAmounts: readonly PackAmount[];
  readonly supplements: readonly SupplementLine[];
  readonly adjustments: readonly Adjustment[];
}

export interface PackedLine extends PackingLine {
  readonly kind: "floor item" | "exchange" | "alternative" | "supplement";
  readonly floorItemId: string | null;
  /** What the line is for, in plain words. */
  readonly for: string;
  /** What is left of the lot in stock once the whole list is packed. */
  readonly remains: number;
  /** True when the lead clinician changed the amount. */
  readonly adjusted: boolean;
}

export interface PackingList {
  readonly lines: readonly PackedLine[];
  /** Anything that must be resolved before the list can be signed off. */
  readonly problems: readonly string[];
}

/** A whole number from 1 to the amount available. */
const fits = (quantity: number, available: number): boolean =>
  Number.isInteger(quantity) && quantity >= 1 && quantity <= available;

const tooMuch = (
  lotId: string,
  quantity: number,
  purpose: string,
  available: number,
): string =>
  `lot ${lotId}: ${String(quantity)} for ${purpose} is not a whole number from 1 to ${String(available)}`;

const stale = (lotId: string): string =>
  `lot ${lotId} is in the floor assessment but not in the stock given: the assessment is out of date: check`;

/** Builds the packing list for one trip. */
export function buildPackingList(input: PackingInput): PackingList {
  const lotById = new Map(input.lots.map((lot) => [lot.lotId, lot]));
  /** A line before its remainder is known, with what its lot holds for this trip. */
  type Draft = Omit<PackedLine, "remains"> & { readonly held: number };
  const lines: Draft[] = [];
  const problems: string[] = [];
  const used = new Set<string>();

  for (const item of input.assessment.items) {
    const name = `${item.genericName} (${item.floorItemId})`;
    if (item.target === null) {
      problems.push(
        `${name} has no target: nothing is packed for it until the lead clinician sets one`,
      );
      continue;
    }
    // Exchanges and alternatives: their amounts are the lead clinician's to enter.
    let covered = 0;
    const others: Draft[] = [];
    for (const [kind, chosen] of [
      ["exchange", item.exchangesAccepted],
      ["alternative", item.alternativesChosen],
    ] as const) {
      for (const { lotId, covers } of chosen) {
        covered += covers;
        const amount = input.packAmounts.find(
          (a) => a.floorItemId === item.floorItemId && a.lotId === lotId,
        );
        if (amount !== undefined) used.add(`${item.floorItemId} ${lotId}`);
        const purpose = `${kind} for ${name}`;
        const lot = lotById.get(lotId);
        if (lot === undefined) {
          problems.push(stale(lotId));
        } else if (amount === undefined) {
          problems.push(
            `${kind} lot ${lotId} for ${name}: the lead clinician enters the amount to pack`,
          );
        } else if (!fits(amount.quantity, lot.quantity)) {
          problems.push(tooMuch(lotId, amount.quantity, purpose, lot.quantity));
        } else {
          others.push({
            lotId,
            held: lot.quantity,
            quantity: amount.quantity,
            kind,
            floorItemId: item.floorItemId,
            for: purpose,
            adjusted: false,
          });
        }
      }
    }
    // The item's own medicine: soonest expiry first, only what the target still needs.
    const purpose = `floor item ${name}`;
    let need = Math.max(item.target - covered, 0);
    const own = item.lots
      .flatMap((entry) => {
        const lot = lotById.get(entry.lotId);
        if (lot === undefined) problems.push(stale(entry.lotId));
        return lot === undefined ? [] : [lot];
      })
      // Soonest expiry first; eligible lots always have one. Same expiry: by lot id.
      .sort((a, b) => {
        const ea = String(a.eligibility.expiry);
        const eb = String(b.eligibility.expiry);
        return ea === eb ? a.lotId.localeCompare(b.lotId) : ea < eb ? -1 : 1;
      });
    const mine = input.adjustments.filter(
      (a) => a.floorItemId === item.floorItemId,
    );
    for (const change of mine) {
      if (!own.some((lot) => lot.lotId === change.lotId)) {
        problems.push(
          `lot ${change.lotId} is not a lot of ${name}: its amount cannot be changed there`,
        );
      }
    }
    for (const lot of own) {
      const take = Math.min(lot.quantity, need);
      need -= take;
      const change = mine.find((a) => a.lotId === lot.lotId);
      if (change !== undefined && !fits(change.quantity, lot.quantity)) {
        problems.push(
          tooMuch(lot.lotId, change.quantity, purpose, lot.quantity),
        );
      }
      const quantity =
        change !== undefined && fits(change.quantity, lot.quantity)
          ? change.quantity
          : take;
      if (quantity > 0) {
        lines.push({
          lotId: lot.lotId,
          held: lot.quantity,
          quantity,
          kind: "floor item",
          floorItemId: item.floorItemId,
          for: purpose,
          adjusted: quantity !== take,
        });
      }
    }
    // Then the exchanges and alternatives, after the item's own medicine.
    lines.push(...others);
  }

  const onList = new Set(input.assessment.items.map((i) => i.floorItemId));
  for (const change of input.adjustments) {
    if (!onList.has(change.floorItemId)) {
      problems.push(
        `an amount change is entered for lot ${change.lotId} for ${change.floorItemId}, which is not on the floor list: check`,
      );
    }
  }
  for (const amount of input.packAmounts) {
    if (!used.has(`${amount.floorItemId} ${amount.lotId}`)) {
      problems.push(
        `an amount is entered for lot ${amount.lotId} for ${amount.floorItemId}, but it is not an accepted exchange or a chosen alternative: check`,
      );
    }
  }

  for (const supplement of input.supplements) {
    const lot = lotById.get(supplement.lotId);
    if (lot === undefined) {
      problems.push(`supplement lot ${supplement.lotId} is not in stock`);
    } else if (lot.eligibility.status !== "eligible") {
      problems.push(
        `supplement lot ${supplement.lotId} is not eligible (${lot.eligibility.status.replace("_", " ")}): not packed`,
      );
    } else if (!fits(supplement.quantity, lot.quantity)) {
      problems.push(
        tooMuch(
          supplement.lotId,
          supplement.quantity,
          "supplement",
          lot.quantity,
        ),
      );
    } else {
      lines.push({
        lotId: supplement.lotId,
        held: lot.quantity,
        quantity: supplement.quantity,
        kind: "supplement",
        floorItemId: null,
        for: "supplement",
        adjusted: false,
      });
    }
  }

  const takenFrom = (lotId: string): number =>
    lines
      .filter((l) => l.lotId === lotId)
      .reduce((sum, l) => sum + l.quantity, 0);
  for (const line of lines.filter(
    (l, i) => lines.findIndex((other) => other.lotId === l.lotId) === i,
  )) {
    const total = takenFrom(line.lotId);
    if (total > line.held) {
      problems.push(
        `lot ${line.lotId}: the packing list takes ${String(total)}, but ${String(line.held)} remain in stock: check`,
      );
    }
  }
  return {
    lines: lines.map(({ held, ...line }) => ({
      ...line,
      remains: Math.max(held - takenFrom(line.lotId), 0),
    })),
    problems,
  };
}

/** A signed-off packing list of one of the team's trips. */
export interface SignedOffList {
  readonly tripId: string;
  readonly lines: readonly PackingLine[];
}

export interface StockConflict {
  readonly lotId: string;
  readonly tripIds: readonly string[];
  readonly message: string;
}

/**
 * A lot as the team holds it: what any lot, checked against a trip or not, needs for what remains
 * of it to be worked out. Team stock (P4) passes lots as recorded; a trip passes its checked lots.
 */
export interface HeldLot {
  readonly lotId: string;
  /** The lot number printed on the label, if known (TC-144). */
  readonly lotNumber?: string | null;
  readonly quantity: number;
}

/** Lots that signed-off packing lists together take more of than they hold (OD-017). */
export function stockConflicts(
  lots: readonly HeldLot[],
  lists: readonly SignedOffList[],
): StockConflict[] {
  return lots.flatMap((lot) => {
    const takers = lists.filter((list) =>
      list.lines.some((l) => l.lotId === lot.lotId),
    );
    const total = takers
      .flatMap((list) => list.lines)
      .filter((l) => l.lotId === lot.lotId)
      .reduce((sum, l) => sum + l.quantity, 0);
    if (total <= lot.quantity) return [];
    const tripIds = takers.map((list) => list.tripId);
    return [
      {
        lotId: lot.lotId,
        tripIds,
        message: `Conflict: check: lot ${lotName(lot)} holds ${String(lot.quantity)}, but the signed-off packing lists of ${tripIds.join(" and ")} take ${String(total)}; a person resolves it`,
      },
    ];
  });
}

/**
 * The stock available to one trip: each lot less what the other trips' signed-off lists take. A
 * lot in conflict counts for none of them until a person resolves it (OD-017). Given every trip's
 * signed-off list, it is what remains of each lot for the team (TC-142).
 */
export function availableStock<Lot extends HeldLot>(
  lots: readonly Lot[],
  otherTrips: readonly SignedOffList[],
): Lot[] {
  const conflicted = new Set(
    stockConflicts(lots, otherTrips).map((c) => c.lotId),
  );
  return lots.map((lot) => {
    const reserved = otherTrips
      .flatMap((list) => list.lines)
      .filter((line) => line.lotId === lot.lotId)
      .reduce((sum, line) => sum + line.quantity, 0);
    return {
      ...lot,
      quantity: conflicted.has(lot.lotId) ? 0 : lot.quantity - reserved,
    };
  });
}
