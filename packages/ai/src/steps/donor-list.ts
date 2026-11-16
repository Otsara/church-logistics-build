/**
 * AIC-101: reading a pasted donor list into lots (ARC-008; SYS-001, SYS-002, SYS-119). The AI
 * copies each value exactly as written in the line, or null; it never converts or guesses. The
 * code then checks every copy is in the line, reads the expiry with the same label reader as
 * eligibility, and marks what needs review. Every line waits for a person to confirm it (owner,
 * 2026-11-16; ADR-035). Names are replaced by ids before the prompt is built (ARC-013).
 */
import { readExpiry, type IsoDate } from "@church-logistics/core";
import { z } from "zod";
import type { AiStep } from "../step.ts";
import { keepNumber, keepText, matchLines } from "./lines.ts";

export interface DonorListInput {
  /** The pasted lines, names already replaced by ids. */
  readonly lines: readonly string[];
}

const copied = z.string().nullable();

const lotSchema = z.strictObject({
  line: z.number().int(),
  source_line: z.string(),
  generic_name: copied,
  strength: copied,
  dosage_form: copied,
  quantity: z.number().int().positive().nullable(),
  lot_number: copied,
  expiry_text: copied,
  manufacturer: copied,
  confidence: z.number().min(0).max(1),
});

const outputSchema = z.strictObject({ lots: z.array(lotSchema) });

export type DonorListOutput = z.infer<typeof outputSchema>;

const INSTRUCTIONS = `You read a list of donated medicines for a mission pharmacy team.
Each numbered line below may describe one medicine lot. For each line that describes a medicine, give one item. Lines that do not describe a medicine get no item.
Copy every value exactly as it is written in the line, character for character. Do not correct spelling, expand abbreviations, convert units or dates, or complete anything. If a value is not written in the line, use null. Never guess.
- generic_name: the medicine's name as written.
- strength: the strength as written, for example "500 mg".
- dosage_form: the form as written, for example "TABLET" or "caps".
- quantity: the number of units as a whole number, only if a count is written; otherwise null.
- lot_number: the lot or batch number as written.
- expiry_text: the expiry exactly as written, for example "06/2027" or "MAY 2028"; never a converted date.
- manufacturer: the maker as written.
- confidence: from 0 to 1, how sure you are that this line was read correctly.
Answer with JSON only, with no other text and no code fences, in this form:
{"lots":[{"line":1,"source_line":"<the whole line exactly>","generic_name":null,"strength":null,"dosage_form":null,"quantity":null,"lot_number":null,"expiry_text":null,"manufacturer":null,"confidence":0}]}`;

export const donorListStep: AiStep<DonorListInput, DonorListOutput> = {
  id: "AIC-101",
  tier: "cheap",
  outputSchema,
  buildPrompt: ({ lines }) =>
    `${INSTRUCTIONS}\n\nLines:\n${lines.map((l, i) => `${String(i + 1)}: ${l}`).join("\n")}`,
};

/** One line as read, waiting for a person to confirm it. */
export interface ReadDonorLine {
  readonly line: number;
  readonly sourceLine: string;
  readonly genericName: string | null;
  readonly strength: string | null;
  readonly dosageForm: string | null;
  readonly quantity: number | null;
  readonly lotNumber: string | null;
  readonly expiryText: string | null;
  readonly expiry: IsoDate | null;
  readonly expiryMonthOnly: boolean;
  readonly manufacturer: string | null;
  readonly confidence: number;
  readonly needsReview: boolean;
  readonly reasons: readonly string[];
  readonly status: "to confirm";
}

export interface DonorListResult {
  readonly lines: readonly ReadDonorLine[];
  /** Lines the AI gave no usable item for: entered by hand, or dismissed if not a medicine. */
  readonly unread: readonly { line: number; sourceLine: string }[];
  readonly problems: readonly string[];
}

/** Checks the AI's answer against the lines. Never throws. */
export function checkDonorList(
  input: DonorListInput,
  output: DonorListOutput,
): DonorListResult {
  const { accepted, unread, problems } = matchLines(input.lines, output.lots);
  const lines = accepted.map((item): ReadDonorLine => {
    const text = item.source_line;
    const reasons: string[] = [];
    const genericName = keepText(
      text,
      "medicine name",
      item.generic_name,
      reasons,
    );
    const strength = keepText(text, "strength", item.strength, reasons);
    const dosageForm = keepText(text, "dosage form", item.dosage_form, reasons);
    const quantity = keepNumber(text, item.quantity, reasons);
    const lotNumber = keepText(text, "lot number", item.lot_number, reasons);
    const expiryText = keepText(text, "expiry", item.expiry_text, reasons);
    const manufacturer = keepText(text, "maker", item.manufacturer, reasons);
    if (genericName === null) reasons.push("no medicine name read");
    // The form is needed to match the catalogue entry and its route (owner, 2026-11-16; REV-010).
    if (dosageForm === null) reasons.push("no dosage form read");
    if (quantity === null) reasons.push("no quantity read");
    if (lotNumber === null) reasons.push("no lot number read");
    const reading = readExpiry(expiryText);
    if (!reading.ok) reasons.push(reading.reason);
    return {
      line: item.line,
      sourceLine: text,
      genericName,
      strength,
      dosageForm,
      quantity,
      lotNumber,
      expiryText,
      expiry: reading.ok ? reading.expiry.date : null,
      expiryMonthOnly: reading.ok && reading.expiry.monthOnly,
      manufacturer,
      confidence: item.confidence,
      needsReview: reasons.length > 0,
      reasons,
      status: "to confirm",
    };
  });
  return { lines, unread, problems };
}
