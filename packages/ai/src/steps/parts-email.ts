/**
 * AIC-301: reading a parts email or inventory list (ARC-008; SYS-001, SYS-002, SYS-313). The AI
 * copies only the part number, quantity and description, exactly as written, or null. The base
 * and whether a part is serviceable are never read by the AI: a person enters them when
 * confirming the line, so the AI can never make a part serviceable (owner, 2026-11-16; ADR-035).
 */
import { z } from "zod";
import type { AiStep } from "../step.ts";
import { keepCode, keepNumber, keepText, matchLines } from "./lines.ts";

export interface PartsEmailInput {
  /** The email's lines, names already replaced by ids. */
  readonly lines: readonly string[];
}

const partSchema = z.strictObject({
  line: z.number().int(),
  source_line: z.string(),
  part_number: z.string().nullable(),
  // 0 is valid: a part with none in stock is kept as read and never appears (SYS-302, ADR-038).
  quantity: z.number().int().nonnegative().nullable(),
  description: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

const outputSchema = z.strictObject({ parts: z.array(partSchema) });

export type PartsEmailOutput = z.infer<typeof outputSchema>;

const INSTRUCTIONS = `You read an email or inventory list about aircraft parts for a mission aviation team.
Each numbered line below may mention one part. For each line that mentions a part number, give one item. Lines that do not mention a part get no item.
Copy every value exactly as it is written in the line, character for character. Do not correct, expand or complete anything. If a value is not written in the line, use null. Never guess.
- part_number: the part number exactly as written.
- quantity: the number of that part available, as a whole number, only if a count is written; otherwise null.
- description: the part's description as written.
- confidence: from 0 to 1, how sure you are that this line was read correctly.
Answer with JSON only, with no other text and no code fences, in this form:
{"parts":[{"line":1,"source_line":"<the whole line exactly>","part_number":null,"quantity":null,"description":null,"confidence":0}]}`;

export const partsEmailStep: AiStep<PartsEmailInput, PartsEmailOutput> = {
  id: "AIC-301",
  tier: "cheap",
  outputSchema,
  buildPrompt: ({ lines }) =>
    `${INSTRUCTIONS}\n\nLines:\n${lines.map((l, i) => `${String(i + 1)}: ${l}`).join("\n")}`,
};

/** One part as read, waiting for a person to enter its base and serviceability and confirm it. */
export interface ReadPartLine {
  readonly line: number;
  readonly sourceLine: string;
  readonly partNumber: string | null;
  readonly quantity: number | null;
  readonly description: string | null;
  readonly confidence: number;
  /** Entered by a person, never read by the AI. */
  readonly baseId: null;
  /** Entered by a person, never read by the AI. */
  readonly serviceable: null;
  readonly needsReview: boolean;
  readonly reasons: readonly string[];
  readonly status: "to confirm: a person enters the base and whether it is serviceable";
}

export interface PartsEmailResult {
  readonly lines: readonly ReadPartLine[];
  readonly unread: readonly { line: number; sourceLine: string }[];
  readonly problems: readonly string[];
}

/** Checks the AI's answer against the lines. Never throws. */
export function checkPartsEmail(
  input: PartsEmailInput,
  output: PartsEmailOutput,
): PartsEmailResult {
  const { accepted, unread, problems } = matchLines(input.lines, output.parts);
  const lines = accepted.map((item): ReadPartLine => {
    const text = item.source_line;
    const reasons: string[] = [];
    const partNumber = keepCode(text, "part number", item.part_number, reasons);
    const quantity = keepNumber(text, item.quantity, reasons);
    const description = keepText(
      text,
      "description",
      item.description,
      reasons,
    );
    if (partNumber === null) reasons.push("no part number read");
    if (quantity === null) reasons.push("no quantity read");
    return {
      line: item.line,
      sourceLine: text,
      partNumber,
      quantity,
      description,
      confidence: item.confidence,
      baseId: null,
      serviceable: null,
      needsReview: reasons.length > 0,
      reasons,
      status:
        "to confirm: a person enters the base and whether it is serviceable",
    };
  });
  return { lines, unread, problems };
}
