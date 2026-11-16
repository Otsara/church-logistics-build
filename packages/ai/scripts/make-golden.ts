/**
 * Builds the golden example inputs and expected results for the donor-list (AIC-101) and
 * parts-email (AIC-301) readers from the development two thirds of the synthetic corpus only
 * (DAT-004). Lines are written in a mix of real-world styles: label dates, month names, missing
 * lot numbers, an unreadable expiry, header lines that are not items. The model's answers are
 * recorded separately (record-golden.ts); until then each example's `recorded` is null.
 * Usage: node packages/ai/scripts/make-golden.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readExpiry } from "@church-logistics/core";

const ROOT = join(import.meta.dirname, "../../..");
const read = (path: string): unknown =>
  JSON.parse(readFileSync(join(ROOT, path), "utf8"));

interface Lot {
  readonly id: string;
  readonly donorId: string;
  readonly genericName: string;
  readonly dosageForm: string;
  readonly strength: string | null;
  readonly quantity: number;
  readonly lotNumber: string;
  readonly expiry: string;
}
interface Part {
  readonly id: string;
  readonly partNumber: string;
  readonly description: string;
  readonly baseId: string;
  readonly quantity: number;
}
interface Scenario<T> {
  readonly id: string;
  readonly data: T;
}

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];
const EXAMPLES = 15;

const prepped = read("data/synthetic/development/prepped.json") as {
  scenarios: Scenario<{ lots: Lot[] }>[];
};

/** One donor line in style k, and what reading it must give. */
function donorLine(lot: Lot, k: number, unreadable: boolean) {
  const [year = "", month = ""] = lot.expiry.split("-");
  const name = lot.genericName;
  const strength = lot.strength ?? "";
  const form = lot.dosageForm;
  const expiryText = unreadable
    ? "see box"
    : ([
        lot.expiry,
        `${month}/${year}`,
        `${MONTHS[Number(month) - 1] ?? ""} ${year}`,
        lot.expiry,
      ][k % 4] ?? "");
  const text =
    [
      `${name} ${strength} ${form} x${String(lot.quantity)} lot ${lot.lotNumber} exp ${expiryText}`,
      `${name} ${strength} ${form} - qty ${String(lot.quantity)} - Lot: ${lot.lotNumber} - Exp: ${expiryText}`,
      `${name} ${form} ${strength}, ${String(lot.quantity)} units, batch ${lot.lotNumber}, EXP ${expiryText}`,
      `${name} ${strength} ${form} x${String(lot.quantity)}, expiry ${expiryText}`,
    ][k % 4]?.replace(/\s+/g, " ") ?? "";
  const reading = readExpiry(unreadable ? "see box" : expiryText);
  const lotNumber = k % 4 === 3 ? null : lot.lotNumber;
  return {
    text,
    expected: {
      genericName: name,
      quantity: lot.quantity,
      lotNumber,
      expiry: reading.ok ? reading.expiry.date : null,
      needsReview: lotNumber === null || !reading.ok,
    },
  };
}

const donorExamples = prepped.scenarios
  .slice(0, EXAMPLES)
  .map((scenario, n) => {
    const lots = scenario.data.lots.slice(0, 4);
    const donor = lots[0]?.donorId ?? "D000";
    const lines = [`Donor list from ${donor}`];
    const expected = [];
    for (const [k, lot] of lots.entries()) {
      const { text, expected: e } = donorLine(lot, k, n % 3 === 0 && k === 1);
      lines.push(text);
      expected.push({ line: lines.length, ...e });
    }
    return {
      id: `AIC-101-${String(n + 1).padStart(2, "0")}`,
      source: { scenario: scenario.id, records: lots.map((l) => l.id) },
      lines,
      expected,
      recorded: null,
    };
  });

const sparewing = read("data/synthetic/development/sparewing.json") as {
  scenarios: Scenario<{ parts: Part[] }>[];
};

function partLine(part: Part, k: number) {
  if (part.quantity === 0) {
    return {
      text: `Still waiting on ${part.partNumber}, none here`,
      expected: {
        partNumber: part.partNumber,
        quantity: null,
        description: null,
        needsReview: true,
      },
    };
  }
  const style = k % 3;
  const text =
    [
      `We have ${String(part.quantity)} x ${part.partNumber} (${part.description}) at ${part.baseId}.`,
      `P/N ${part.partNumber}, qty ${String(part.quantity)}`,
      `${part.partNumber} - ${part.description} - ${String(part.quantity)} on the shelf`,
    ][style] ?? "";
  return {
    text,
    expected: {
      partNumber: part.partNumber,
      quantity: part.quantity,
      description: style === 1 ? null : part.description,
      needsReview: false,
    },
  };
}

const partsExamples = sparewing.scenarios
  .slice(0, EXAMPLES)
  .map((scenario, n) => {
    const parts = scenario.data.parts.slice(0, 3);
    const lines = [`Subject: parts stock update (${scenario.id})`];
    const expected = [];
    for (const [k, part] of parts.entries()) {
      const { text, expected: e } = partLine(part, k + n);
      lines.push(text);
      expected.push({ line: lines.length, ...e });
    }
    return {
      id: `AIC-301-${String(n + 1).padStart(2, "0")}`,
      source: { scenario: scenario.id, records: parts.map((p) => p.id) },
      lines,
      expected,
      recorded: null,
    };
  });

const write = (name: string, examples: unknown[]) => {
  const path = join(ROOT, "packages/ai/golden", name);
  let kept: { id: string; recorded: unknown }[] = [];
  try {
    kept = (JSON.parse(readFileSync(path, "utf8")) as { examples: typeof kept })
      .examples;
  } catch {
    kept = [];
  }
  // Keep any recordings already made for unchanged examples.
  const recordedById = new Map(kept.map((e) => [e.id, e.recorded]));
  const merged = (examples as { id: string; recorded: unknown }[]).map((e) => ({
    ...e,
    recorded: recordedById.get(e.id) ?? null,
  }));
  writeFileSync(
    path,
    `${JSON.stringify({ synthetic: true, partition: "development", examples: merged }, null, 2)}\n`,
  );
};

write("aic-101-donor-list.json", donorExamples);
write("aic-301-parts-email.json", partsExamples);
process.stdout.write(
  `${String(donorExamples.length)} donor-list and ${String(partsExamples.length)} parts-email examples written\n`,
);
