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
import { ungrounded, wordsIn, type Value } from "./grounding.ts";

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
Use only the facts below; mention only their codes, dates and numbers. Write dates exactly as given (YYYY-MM-DD), never as today, tomorrow, a weekday or "next week", and describe each date as expected or estimated, never confirmed or promised. Never say that flights will resume: say only when the disruption is expected to end. Refer to people only by the ids given, never by a name or title. Never say the aircraft is ${FORBIDDEN_IN_WORDS}: the flight base director, mechanic and pilot decide.
Answer with JSON only, with no other text and no code fences, in this form:
{"message":"<the message>"}

Facts:
${JSON.stringify(input)}`,
};

/** Words for a date that code cannot check against the dates given (owner, 2026-11-17; ADR-040). */
const RELATIVE_DATES = [
  "today",
  "tonight",
  "tomorrow",
  "yesterday",
  "soon",
  "shortly",
  "(?:next|this|last)\\s+(?:week|weekend|month|year)",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

/** Words that promise a date that is only expected (SYS-309; owner, 2026-11-17; ADR-040). */
const PROMISES = [
  "confirmed",
  "guarantee\\p{L}*",
  "definitely",
  "promis\\p{L}*",
];

/**
 * A title followed by a capitalised name: the AI never gets names (ARC-013), so a named person
 * is invented (owner, 2026-11-17; ADR-040).
 */
const TITLED_NAME =
  /(?<![\p{L}])(?:Pastor|Reverend|Rev|Father|Fr|Brother|Br|Sister|Sr|Mrs|Mr|Ms|Miss|Doctor|Dr|Captain|Capt|Elder|Deacon|Bishop)\.?\s+\p{Lu}\p{L}*/gu;

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
    ...wordsIn(output.message, RELATIVE_DATES).map(
      (word) => `the message says "${word}": use the dates given`,
    ),
    ...[...output.message.matchAll(TITLED_NAME)].map(
      ([name]) =>
        `the message names a person ("${name}"): refer to people only by the ids given`,
    ),
    ...wordsIn(output.message, PROMISES).map(
      (word) => `the message says "${word}": dates are expected, not promised`,
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
