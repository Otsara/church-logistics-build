/**
 * AIC-302: drafting a message to a base or community about a disruption (ARC-008; SYS-005,
 * SYS-310; TC-310). The AI gets ids only, never names (ARC-013). Its message must mention only
 * codes, dates and numbers given to it, and never claim an approval; otherwise it is not accepted
 * and the blank template is shown. An accepted message is a draft that a person reviews and
 * sends: SpareWing never sends it (owner, 2026-11-16; ADR-039). The message also may not use a
 * relative date, name a person or promise a date (owner, 2026-11-17; REV-011, ADR-040).
 */
import { z } from "zod";
import type { AiStep } from "../step.ts";
import {
  FORBIDDEN_IN_WORDS,
  forbiddenClaims,
  newDraft,
  type Draft,
} from "./drafts.ts";
import { ungrounded, type Value } from "./grounding.ts";
import { WORDING_RULES, wordingProblems } from "./wording.ts";

export interface MessageInput {
  readonly disruptionId: string;
  readonly aircraftId: string;
  readonly start: string;
  readonly expectedEnd: string;
  readonly candidate: {
    readonly kind: "part" | "pilot";
    readonly id: string;
    readonly partNumber?: string;
    readonly sourceBaseId?: string;
    readonly eta?: string;
  };
  readonly to: { readonly kind: "base" | "community"; readonly id: string };
}

const outputSchema = z.strictObject({ message: z.string().min(1) });

export type MessageOutput = z.infer<typeof outputSchema>;

export const messageStep: AiStep<MessageInput, MessageOutput> = {
  id: "AIC-302",
  tier: "strong",
  outputSchema,
  buildPrompt: (
    input,
  ) => `Draft a short, plain message from a mission aviation team to the ${input.to.kind} ${input.to.id} about this disruption and the chosen ${input.candidate.kind}. A person will review and send it.
Use only the facts below; mention only their codes, dates and numbers. ${WORDING_RULES} Never say that flights will resume: say only when the disruption is expected to end. Never say the aircraft is ${FORBIDDEN_IN_WORDS}: the flight base director, mechanic and pilot decide.
Answer with JSON only, with no other text and no code fences, in this form:
{"message":"<the message>"}

Facts:
${JSON.stringify(input)}`,
};

/** Every value in the input, for grounding the message. */
const valuesOf = (v: unknown): Value[] =>
  typeof v === "object" && v !== null
    ? Object.values(v).flatMap(valuesOf)
    : [String(v)];

export interface MessageResult {
  readonly accepted: boolean;
  readonly problems: readonly string[];
  /** The draft to review; null when not accepted, and the blank template is shown. */
  readonly draft: Draft | null;
  readonly sending: "a person reviews and sends this message; it is never sent automatically";
}

/** Checks a drafted message against the disruption. Never throws. */
export function checkMessage(
  input: MessageInput,
  output: MessageOutput,
): MessageResult {
  const problems = [
    ...forbiddenClaims(output.message).map(
      (word) => `the message says "${word}": nothing here approves anything`,
    ),
    ...wordingProblems(output.message).map(
      (problem) => `the message ${problem}`,
    ),
    ...ungrounded(output.message, valuesOf(input)).map(
      (token) =>
        `the message mentions "${token}", which is not in the disruption`,
    ),
  ];
  return {
    accepted: problems.length === 0,
    problems,
    draft: problems.length === 0 ? newDraft("AIC-302", output.message) : null,
    sending:
      "a person reviews and sends this message; it is never sent automatically",
  };
}
