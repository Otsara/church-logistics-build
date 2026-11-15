/**
 * Merging donor lines into lots (ARC-101; safety-critical). Runs in core, never in the AI step
 * (OD-011, ADR-017). Lines merge only when lot number, generic name, strength, dosage form,
 * expiry and manufacturer all match; the merged lot sums the quantities and keeps every donor
 * (OD-054, ADR-024). Lines sharing a lot number that do not merge stay separate, each flagged
 * "Same lot number, different details: check" (TC-127). The same medicine from the same known
 * manufacturer with different expiry dates also needs review (SYS-117, TC-121). A line without a
 * manufacturer, a lot number or a readable expiry never merges (owner, 2026-11-13).
 */
import { readExpiry } from "./expiry.ts";

export const SAME_LOT_NUMBER_FLAG = "Same lot number, different details: check";

/** One line of a donor's list, as entered or as read by the donor-list step and checked. */
export interface DonorLine {
  readonly lineId: string;
  readonly donorId: string;
  readonly lotNumber: string | null;
  readonly genericName: string;
  readonly strength: string | null;
  readonly dosageForm: string;
  /** The expiry as entered; read by `readExpiry`. */
  readonly expiry: string | null;
  readonly manufacturer: string | null;
  readonly quantity: number;
}

export interface MergedLot {
  readonly lineIds: readonly string[];
  readonly lotNumber: string | null;
  readonly genericName: string;
  readonly strength: string | null;
  readonly dosageForm: string;
  /** The first line's expiry as entered; eligibility reads it (SYS-105). */
  readonly expiry: string | null;
  readonly manufacturer: string | null;
  readonly quantity: number;
  readonly donors: readonly {
    readonly donorId: string;
    readonly lineId: string;
    readonly quantity: number;
  }[];
  readonly flags: readonly string[];
  readonly needsReview: boolean;
}

const norm = (value: string | null): string | null => {
  const text = value?.trim().toLowerCase() ?? "";
  return text === "" ? null : text;
};

const howMany = (n: number): string => (n === 2 ? "two" : String(n));

interface Draft {
  readonly first: DonorLine;
  readonly lot: string | null;
  /** Name, strength, form and manufacturer: the same medicine from the same known maker. */
  readonly medicine: string | null;
  readonly date: string | null;
  readonly lines: DonorLine[];
  readonly flags: string[];
  needsReview: boolean;
}

/** Merges donor lines into lots, in the order first entered. Never throws. */
export function mergeDonorLines(lines: readonly DonorLine[]): MergedLot[] {
  const drafts: Draft[] = [];
  const byKey = new Map<string, Draft>();
  for (const line of lines) {
    const lot = norm(line.lotNumber);
    const maker = norm(line.manufacturer);
    const reading = readExpiry(line.expiry);
    const date = reading.ok ? reading.expiry.date : null;
    const medicine =
      maker === null
        ? null
        : [line.genericName, line.strength, line.dosageForm, maker]
            .map((part) => norm(part) ?? "")
            .join("|");
    const key =
      lot === null || medicine === null || date === null
        ? null
        : `${lot}|${medicine}|${date}`;
    const existing = key === null ? undefined : byKey.get(key);
    if (existing !== undefined) {
      existing.lines.push(line);
      continue;
    }
    const draft: Draft = {
      first: line,
      lot,
      medicine,
      date,
      lines: [line],
      flags: [],
      needsReview: false,
    };
    drafts.push(draft);
    if (key !== null) byKey.set(key, draft);
  }

  for (const draft of drafts) {
    if (draft.lot === null) continue;
    const sameLot = drafts.filter((other) => other.lot === draft.lot);
    if (sameLot.length < 2) continue;
    draft.flags.push(SAME_LOT_NUMBER_FLAG);
    if (draft.medicine === null) continue;
    const dates = [
      ...new Set(
        sameLot
          .filter((other) => other.medicine === draft.medicine)
          .map((other) => other.date)
          .filter((d) => d !== null),
      ),
    ].sort();
    if (dates.length > 1) {
      draft.needsReview = true;
      draft.flags.push(
        `one lot number with ${howMany(dates.length)} expiry dates (${dates.join(" and ")}): check`,
      );
    }
  }

  return drafts.map(({ first, lines: merged, flags, needsReview }) => ({
    lineIds: merged.map((l) => l.lineId),
    lotNumber: first.lotNumber,
    genericName: first.genericName,
    strength: first.strength,
    dosageForm: first.dosageForm,
    expiry: first.expiry,
    manufacturer: first.manufacturer,
    quantity: merged.reduce((sum, l) => sum + l.quantity, 0),
    donors: merged.map((l) => ({
      donorId: l.donorId,
      lineId: l.lineId,
      quantity: l.quantity,
    })),
    flags,
    needsReview,
  }));
}
