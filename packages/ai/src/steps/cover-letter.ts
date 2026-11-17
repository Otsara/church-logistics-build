/**
 * AIC-102: the covering letter for a medicine shipment (ARC-008; SYS-004, SYS-005; TC-007,
 * TC-008). Code builds the checklist from the destination's rule card, word for word, and adds it
 * after the letter; the AI writes only the letter. Every sentence that states a requirement must
 * cite a card item, and a cited item must be on the card. The letter may mention only the trip's
 * and the card's codes, dates and numbers, follows the wording rules, and never claims an
 * approval. Otherwise it is not accepted and the blank template is shown, with the same checklist
 * (owner, 2026-11-16; ADR-039, ADR-042).
 */
import { checklist, type DestinationCard } from "@church-logistics/core";
import { z } from "zod";
import type { AiStep } from "../step.ts";
import {
  FORBIDDEN_IN_WORDS,
  forbiddenClaims,
  newDraft,
  type Draft,
} from "./drafts.ts";
import { ungrounded, valuesIn, wordsIn } from "./grounding.ts";
import { WORDING_RULES, wordingProblems } from "./wording.ts";

export interface CoverLetterInput {
  readonly tripId: string;
  readonly arrivalDate: string;
  readonly card: DestinationCard;
  /** The card items whose documents are prepared. */
  readonly preparedItemIds: readonly string[];
  readonly medicines: readonly {
    readonly genericName: string;
    readonly strength: string | null;
    readonly quantity: number;
  }[];
}

const outputSchema = z.strictObject({
  sentences: z.array(
    z.strictObject({ text: z.string().min(1), cites: z.array(z.string()) }),
  ),
});

export type CoverLetterOutput = z.infer<typeof outputSchema>;

/** What the AI is told: ids, the card's items and the medicines; never names (ARC-013). */
const factsOf = (input: CoverLetterInput) => ({
  tripId: input.tripId,
  arrivalDate: input.arrivalDate,
  cardId: input.card.id,
  country: input.card.country,
  items: input.card.items.map(({ id, requirement, document }) => ({
    id,
    requirement,
    document,
  })),
  medicines: input.medicines,
});

export const coverLetterStep: AiStep<CoverLetterInput, CoverLetterOutput> = {
  id: "AIC-102",
  tier: "strong",
  outputSchema,
  buildPrompt: (
    input,
  ) => `Write a short, plain covering letter from a mission medical team to go with this shipment of donated medicines to ${input.card.country}. A person will review it.
Use only the facts below. Write the letter as sentences. A sentence that says what the destination requires, or mentions a permit, licence, regulation, import or customs, lists in "cites" the id of each rule card item it relies on; never state a requirement that is not one of the items. Do not write the checklist: code adds it after the letter. Mention only the codes, dates and numbers in the facts. ${WORDING_RULES} Never say that the shipment or anything in it is ${FORBIDDEN_IN_WORDS}: officials and the team decide.
Answer with JSON only, with no other text and no code fences, in this form:
{"sentences":[{"text":"<one plain sentence>","cites":["<item id>"]}]}

Facts:
${JSON.stringify(factsOf(input))}`,
};

/** Words that state or touch on a requirement, so the sentence must cite the card. */
const REQUIREMENT_WORDS = [
  "must",
  "shall",
  "requir\\p{L}*",
  "mandatory",
  "obligatory",
  "needs? to",
  "needed",
  "permits?",
  "licen[cs]e\\p{L}*",
  "regulat\\p{L}*",
  "laws?",
  "prohibited",
  "forbidden",
  "restricted",
  "allowed",
  "import\\p{L}*",
  "customs",
];

export interface CoverLetterResult {
  readonly accepted: boolean;
  readonly problems: readonly string[];
  /** The letter and checklist to review; null when not accepted, and the template is shown. */
  readonly draft: Draft | null;
  /** The blank template: a place for the team's letter, then the same checklist. */
  readonly template: string;
}

/** Checks a covering letter against the trip and its rule card. Never throws. */
export function checkCoverLetter(
  input: CoverLetterInput,
  output: CoverLetterOutput,
): CoverLetterResult {
  const values = valuesIn(factsOf(input));
  const onCard = new Set(input.card.items.map((item) => item.id));
  const problems: string[] = [];
  if (output.sentences.length === 0) problems.push("the letter is empty");
  for (const [i, { text, cites }] of output.sentences.entries()) {
    const say = (problem: string): void => {
      problems.push(`sentence ${String(i + 1)} ${problem}`);
    };
    for (const word of forbiddenClaims(text)) {
      say(`says "${word}": nothing here approves anything`);
    }
    for (const problem of wordingProblems(text)) say(problem);
    for (const id of cites.filter((c) => !onCard.has(c))) {
      say(`cites ${id}, which is not on rule card ${input.card.id}`);
    }
    if (cites.length === 0 && wordsIn(text, REQUIREMENT_WORDS).length > 0) {
      say("states a requirement without citing a rule card item");
    }
    for (const token of ungrounded(text, values)) {
      say(`mentions "${token}", which is not in the trip or the rule card`);
    }
  }
  const list = checklist(input.card, new Set(input.preparedItemIds)).join("\n");
  const letter = output.sentences.map((s) => s.text).join(" ");
  return {
    accepted: problems.length === 0,
    problems,
    draft:
      problems.length === 0
        ? newDraft("AIC-102", `${letter}\n\n${list}`)
        : null,
    template: `[Covering letter: the team writes it here.]\n\n${list}`,
  };
}
