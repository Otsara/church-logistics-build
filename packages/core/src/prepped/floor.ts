/**
 * Prepped floor coverage, the Go or No go indicator and the readiness meter (ARC-101;
 * safety-critical). Pure: lots arrive already checked by `checkLot`, and nothing here reads the
 * clock or calls an AI step (SYS-003).
 *
 * - A floor item is met by eligible lots of its own catalogue entry (same medicine, strength and
 *   form), combined across donations and makers, each lot listed with its maker (SYS-113, OD-054).
 * - Eligible lots of the same medicine in another form or strength are offered as exchanges, and
 *   count only as accepted by the clinician, exactly the amount entered: no dose conversion
 *   (SYS-115, ADR-011).
 * - "Go" only when every floor item is covered and every required document is prepared and marked
 *   reviewed (SYS-112); otherwise "No go", listing what is short or missing. Always labelled as an
 *   indicator only (ADR-009).
 * - Meter: priority-weighted coverage (3, 2, 1) counts 70% and documents 30% (SYS-106, ADR-017).
 * - Anything that could overstate coverage needs review instead: no target, or a target of 0 not
 *   yet confirmed (SYS-110), an accepted exchange that is not valid, or a lot that would count
 *   twice (ADR-023).
 */
import type { LotEligibility } from "./eligibility.ts";

export const INDICATOR_LABEL =
  "Indicator only: deploying the team is the lead clinician's or team leader's decision";

/** Priority 1 is the most important (OD-040). */
const PRIORITY_WEIGHT = { 1: 3, 2: 2, 3: 1 } as const;
/** Coverage and documents in the meter (OD-004: 70/30; 75/25 or 80/20 also acceptable). */
const METER_SPLIT = { coverage: 0.7, documents: 0.3 } as const;

/** One item of the lead clinician's floor list (SYS-110). */
export interface FloorItem {
  readonly id: string;
  readonly catalogEntryId: string;
  readonly genericName: string;
  /** Set by the lead clinician; null until entered. */
  readonly target: number | null;
  readonly priority: 1 | 2 | 3;
  /** The lead clinician confirmed that a target of 0 is intended (owner, 2026-11-13). */
  readonly zeroTargetConfirmed?: boolean;
  /** The catalogue entry's EPC classes, for comparable alternatives (SYS-108). */
  readonly classes?: readonly string[];
}

/** A donated lot with its catalogue entry and its eligibility for this trip. */
export interface StockLot {
  readonly lotId: string;
  /** The lot number printed on the label; reasons name the lot by it (TC-144). */
  readonly lotNumber?: string | null;
  readonly donorId: string;
  /** The maker, as on the label; null if not recorded. Shown beside every lot (OD-054). */
  readonly manufacturer: string | null;
  readonly catalogEntryId: string;
  readonly genericName: string;
  readonly dosageForm: string;
  readonly strength: string | null;
  readonly quantity: number;
  readonly eligibility: LotEligibility;
  /** The catalogue entry's EPC classes, for comparable alternatives (SYS-108). */
  readonly classes?: readonly string[];
}

/** An exchange the clinician accepted, with the share of the target it covers (SYS-115). */
export interface AcceptedExchange {
  readonly floorItemId: string;
  readonly lotId: string;
  readonly covers: number;
}

/**
 * A comparable alternative the clinician chose, with the share of the target it covers
 * (OD-055 option b; owner, 2026-11-15; ADR-026).
 */
export interface ChosenAlternative {
  readonly floorItemId: string;
  readonly lotId: string;
  readonly covers: number;
}

/** A document the destination's rule card requires (SYS-112). */
export interface RequiredDocument {
  readonly id: string;
  readonly name: string;
  readonly prepared: boolean;
  readonly reviewed: boolean;
}

export interface FloorInput {
  readonly floorItems: readonly FloorItem[];
  readonly lots: readonly StockLot[];
  readonly acceptedExchanges: readonly AcceptedExchange[];
  readonly requiredDocuments: readonly RequiredDocument[];
  readonly chosenAlternatives?: readonly ChosenAlternative[];
}

export interface FloorItemCoverage {
  readonly floorItemId: string;
  readonly genericName: string;
  readonly status: "covered" | "short" | "needs_review";
  readonly target: number | null;
  readonly priority: 1 | 2 | 3;
  /** Eligible lots of the item's own product, from every donation. */
  readonly lots: readonly {
    readonly lotId: string;
    readonly donorId: string;
    readonly manufacturer: string | null;
    readonly quantity: number;
  }[];
  /** Eligible lots of the same medicine in another form or strength, not yet accepted. */
  readonly exchangesOffered: readonly {
    readonly lotId: string;
    readonly donorId: string;
    readonly manufacturer: string | null;
    readonly dosageForm: string;
    readonly strength: string | null;
    readonly quantity: number;
  }[];
  /** Accepted exchanges that count, each with the amount the clinician entered. */
  /** Comparable alternatives the clinician chose that count, each with the amount entered. */
  readonly alternativesChosen: readonly {
    readonly lotId: string;
    readonly covers: number;
  }[];
  readonly exchangesAccepted: readonly {
    readonly lotId: string;
    readonly covers: number;
  }[];
  /** Own-product quantity plus accepted exchange amounts. */
  readonly covered: number;
  /** Target minus covered, never below 0; null when the item needs review. */
  readonly short: number | null;
  /** Covered over target, capped at 1; 0 when the item needs review. */
  readonly coverage: number;
  readonly reasons: readonly string[];
}

export interface FloorAssessment {
  readonly items: readonly FloorItemCoverage[];
  readonly indicator: "Go" | "No go";
  readonly label: typeof INDICATOR_LABEL;
  readonly shortages: readonly {
    readonly floorItemId: string;
    readonly genericName: string;
    readonly short: number | null;
  }[];
  readonly missingDocuments: readonly {
    readonly documentId: string;
    readonly name: string;
    readonly reason:
      | "not prepared"
      | "prepared, not yet marked reviewed by the lead clinician or team leader";
  }[];
  /** Problems with the floor list as a whole; any one means "No go". */
  readonly problems: readonly string[];
  readonly meter: {
    readonly coverage: number;
    readonly documents: number;
    readonly overall: number;
  };
}

/** A lot named by medicine, strength and form, as the reasons show it (owner, 2026-11-15). */
/**
 * How a reason names a lot: the number printed on its label, or its id when there is none. The id
 * stays the key, since two makers can print the same lot number (ADR-024; TC-144).
 */
export const lotName = (lot: {
  readonly lotId: string;
  readonly lotNumber?: string | null;
}): string =>
  lot.lotNumber !== undefined &&
  lot.lotNumber !== null &&
  lot.lotNumber.trim() !== ""
    ? lot.lotNumber
    : lot.lotId;

const product = (lot: StockLot): string =>
  [lot.genericName, lot.strength, lot.dosageForm.toLowerCase()]
    .filter((part) => part !== null)
    .join(" ");

/** Two or three spelled out; more as digits. */
const howMany = (n: number): string =>
  n === 2 ? "two" : n === 3 ? "three" : String(n);

/** A lot's EPC classes; none when not recorded. */
const classesOf = (lot: StockLot): readonly string[] => lot.classes ?? [];

/** Classes a lot has that the floor item lacks (owner, 2026-11-15; ADR-028). */
const extraClasses = (
  lot: StockLot,
  itemClasses: readonly string[],
): readonly string[] => classesOf(lot).filter((c) => !itemClasses.includes(c));

const sameMedicine = (a: string, b: string): boolean =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

const isAmount = (n: number | null): n is number =>
  n !== null && Number.isFinite(n) && n > 0;

interface Draft {
  readonly item: FloorItem;
  readonly lots: StockLot[];
  readonly accepted: { lotId: string; covers: number }[];
  readonly chosen: { lotId: string; covers: number }[];
  readonly offered: StockLot[];
  readonly reasons: string[];
  readonly zeroConfirmed: boolean;
  review: boolean;
}

/** Assesses the floor list against the stock. Never throws. */
export function assessFloor(input: FloorInput): FloorAssessment {
  const lotById = new Map(input.lots.map((lot) => [lot.lotId, lot]));
  /** A lot as reasons name it: its printed number, or its id when it is not in stock (TC-144). */
  const nameOf = (lotId: string): string =>
    lotName(lotById.get(lotId) ?? { lotId });
  const eligible = input.lots.filter(
    (lot) => lot.eligibility.status === "eligible",
  );
  const itemIds = new Set(input.floorItems.map((item) => item.id));
  const problems: string[] = [];
  if (input.floorItems.length === 0) {
    problems.push(
      "no floor items chosen: the lead clinician picks the floor list",
    );
  }
  for (const exchange of input.acceptedExchanges) {
    if (!itemIds.has(exchange.floorItemId)) {
      problems.push(
        `accepted exchange ${nameOf(exchange.lotId)} is for ${exchange.floorItemId}, which is not on the floor list: check`,
      );
    }
  }
  const chosenAlternatives = input.chosenAlternatives ?? [];
  for (const choice of chosenAlternatives) {
    if (!itemIds.has(choice.floorItemId)) {
      problems.push(
        `chosen alternative ${nameOf(choice.lotId)} is for ${choice.floorItemId}, which is not on the floor list: check`,
      );
    }
  }

  // Which floor items each lot counts toward, so nothing is counted twice.
  const countsToward = new Map<string, string[]>();
  const count = (lotId: string, itemId: string): void => {
    countsToward.set(lotId, [...(countsToward.get(lotId) ?? []), itemId]);
  };

  const drafts = input.floorItems.map((item): Draft => {
    const reasons: string[] = [];
    // A target of 0 is asked about once; when confirmed it needs no further review (SYS-110).
    const zeroConfirmed =
      item.target === 0 && item.zeroTargetConfirmed === true;
    let review = !zeroConfirmed && !isAmount(item.target);
    if (zeroConfirmed) {
      reasons.push("target of 0 confirmed by the lead clinician");
    } else if (item.target === 0) {
      reasons.push(
        "target of 0 entered: the lead clinician confirms it is intended",
      );
    } else if (review) {
      reasons.push("no target quantity entered: the lead clinician sets it");
    }
    const lots = eligible.filter(
      (lot) => lot.catalogEntryId === item.catalogEntryId,
    );
    for (const lot of lots) count(lot.lotId, item.id);

    const accepted: { lotId: string; covers: number }[] = [];
    const mine = input.acceptedExchanges.filter(
      (exchange) => exchange.floorItemId === item.id,
    );
    for (const { lotId, covers } of mine) {
      const lot = lotById.get(lotId);
      const name = `accepted exchange ${nameOf(lotId)}`;
      if (lot === undefined) {
        reasons.push(`${name} is not in the stock list: not counted`);
      } else if (lot.catalogEntryId === item.catalogEntryId) {
        review = true;
        reasons.push(
          `lot ${lotName(lot)} (${product(lot)}) is already counted for this item, so it cannot also be an exchange: check`,
        );
      } else if (!sameMedicine(lot.genericName, item.genericName)) {
        review = true;
        reasons.push(
          `lot ${lotName(lot)} (${product(lot)}) is a different medicine, so it cannot be an exchange for ${item.genericName}: check`,
        );
      } else if (lot.eligibility.status !== "eligible") {
        // Reported before a missing amount: an ineligible lot never counts (ADR-029).
        reasons.push(
          `${name} is not eligible (${lot.eligibility.status.replace("_", " ")}): not counted`,
        );
      } else if (!isAmount(covers)) {
        review = true;
        reasons.push(
          `lot ${lotName(lot)} (${product(lot)}) has no amount entered: the clinician enters how much of the target it covers`,
        );
      } else {
        accepted.push({ lotId, covers });
        count(lotId, item.id);
      }
    }

    // Comparable alternatives the clinician chose: another medicine sharing a class, counting
    // exactly the amount entered (OD-055 option b; owner, 2026-11-15; ADR-026).
    const chosen: { lotId: string; covers: number }[] = [];
    const itemClasses = item.classes ?? [];
    for (const { lotId, covers } of chosenAlternatives.filter(
      (choice) => choice.floorItemId === item.id,
    )) {
      const lot = lotById.get(lotId);
      const name = `chosen alternative ${nameOf(lotId)}`;
      if (lot === undefined) {
        reasons.push(`${name} is not in the stock list: not counted`);
      } else if (sameMedicine(lot.genericName, item.genericName)) {
        review = true;
        reasons.push(
          `lot ${lotName(lot)} (${product(lot)}) is the same medicine, so it is an exchange, not a comparable alternative: check`,
        );
      } else if (!classesOf(lot).some((c) => itemClasses.includes(c))) {
        review = true;
        reasons.push(
          `lot ${lotName(lot)} (${product(lot)}) shares no class with ${item.genericName}, so it cannot be a comparable alternative: check`,
        );
      } else if (extraClasses(lot, itemClasses).length > 0) {
        review = true;
        reasons.push(
          `lot ${lotName(lot)} (${product(lot)}) brings a class ${item.genericName} does not have (${extraClasses(lot, itemClasses).join(", ")}), so it cannot be a comparable alternative: check`,
        );
      } else if (lot.eligibility.status !== "eligible") {
        // Reported before a missing amount: an ineligible lot never counts (ADR-029).
        reasons.push(
          `${name} is not eligible (${lot.eligibility.status.replace("_", " ")}): not counted`,
        );
      } else if (!isAmount(covers)) {
        review = true;
        reasons.push(
          `lot ${lotName(lot)} (${product(lot)}) has no amount entered: the clinician enters how much of the target it covers`,
        );
      } else if (covers > lot.quantity) {
        // More than the lot holds needs a further review (owner, 2026-11-15; ADR-029).
        review = true;
        reasons.push(
          `lot ${lotName(lot)} (${product(lot)}) holds ${String(lot.quantity)} but ${String(covers)} is entered as covering ${item.genericName}: review; find further donations, or the lead clinician redefines the floor`,
        );
      } else {
        chosen.push({ lotId, covers });
        count(lotId, item.id);
        reasons.push(
          `covered partly by a comparable alternative chosen by the clinician: lot ${nameOf(lotId)} (${product(lot)}), ${String(covers)}`,
        );
      }
    }

    const acceptedIds = new Set(mine.map((exchange) => exchange.lotId));
    const offered = eligible.filter(
      (lot) =>
        lot.catalogEntryId !== item.catalogEntryId &&
        sameMedicine(lot.genericName, item.genericName) &&
        !acceptedIds.has(lot.lotId),
    );
    return {
      item,
      lots,
      accepted,
      chosen,
      offered,
      reasons,
      zeroConfirmed,
      review,
    };
  });

  for (const [lotId, ids] of countsToward) {
    if (ids.length < 2) continue;
    for (const draft of drafts) {
      if (!ids.includes(draft.item.id)) continue;
      draft.review = true;
      draft.reasons.push(
        `lot ${nameOf(lotId)} would be counted toward ${howMany(ids.length)} floor items (${ids.join(" and ")}): the clinician resolves it`,
      );
    }
  }

  const items = drafts.map(finish);
  const missingDocuments = input.requiredDocuments
    .filter((doc) => !(doc.prepared && doc.reviewed))
    .map((doc) => ({
      documentId: doc.id,
      name: doc.name,
      reason: doc.prepared
        ? ("prepared, not yet marked reviewed by the lead clinician or team leader" as const)
        : ("not prepared" as const),
    }));
  const shortages = items
    .filter((item) => item.status !== "covered")
    .map(({ floorItemId, genericName, short }) => ({
      floorItemId,
      genericName,
      short,
    }));
  const go =
    problems.length === 0 &&
    shortages.length === 0 &&
    missingDocuments.length === 0;
  return {
    items,
    indicator: go ? "Go" : "No go",
    label: INDICATOR_LABEL,
    shortages,
    missingDocuments,
    problems,
    meter: meter(items, input.requiredDocuments),
  };
}

function finish(draft: Draft): FloorItemCoverage {
  const { item, reasons } = draft;
  const covered =
    draft.lots.reduce((sum, lot) => sum + lot.quantity, 0) +
    draft.accepted.reduce((sum, exchange) => sum + exchange.covers, 0) +
    draft.chosen.reduce((sum, choice) => sum + choice.covers, 0);
  const base = {
    floorItemId: item.id,
    genericName: item.genericName,
    target: item.target,
    priority: item.priority,
    lots: draft.lots.map(({ lotId, donorId, manufacturer, quantity }) => ({
      lotId,
      donorId,
      manufacturer,
      quantity,
    })),
    exchangesOffered: draft.offered.map(
      ({ lotId, donorId, manufacturer, dosageForm, strength, quantity }) => ({
        lotId,
        donorId,
        manufacturer,
        dosageForm,
        strength,
        quantity,
      }),
    ),
    alternativesChosen: draft.chosen,
    exchangesAccepted: draft.accepted,
    covered,
    reasons,
  };
  if (draft.review || item.target === null) {
    return { ...base, status: "needs_review", short: null, coverage: 0 };
  }
  if (draft.zeroConfirmed) {
    return { ...base, status: "covered", short: 0, coverage: 1 };
  }
  const short = Math.max(item.target - covered, 0);
  return {
    ...base,
    status: short === 0 ? "covered" : "short",
    short,
    coverage: Math.min(covered / item.target, 1),
  };
}

function meter(
  items: readonly FloorItemCoverage[],
  documents: readonly RequiredDocument[],
): FloorAssessment["meter"] {
  let weighted = 0;
  let totalWeight = 0;
  for (const item of items) {
    // A confirmed target of 0 asks for nothing, so it neither raises nor lowers the meter.
    if (item.target === 0 && item.status === "covered") continue;
    const weight = PRIORITY_WEIGHT[item.priority];
    weighted += weight * item.coverage;
    totalWeight += weight;
  }
  const coverage = totalWeight === 0 ? 0 : weighted / totalWeight;
  const done = documents.filter((doc) => doc.prepared && doc.reviewed).length;
  // With no documents required, none is missing.
  const documentShare = documents.length === 0 ? 1 : done / documents.length;
  return {
    coverage,
    documents: documentShare,
    overall:
      METER_SPLIT.coverage * coverage + METER_SPLIT.documents * documentShare,
  };
}
