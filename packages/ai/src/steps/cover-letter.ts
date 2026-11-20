/**
 * AIC-102: the covering letter for a medicine shipment (ARC-008; SYS-004, SYS-005, SYS-120;
 * TC-007, TC-008, TC-139). Code builds what follows the letter: the trip's medicine list, then the
 * checklist of each of the trip's rule cards (the cards for every destination, then the
 * country's), word for word. The AI writes only the letter (owner, 2026-11-16; ADR-039, ADR-042).
 * After the owner's review (REV-012, ADR-044), a sentence that states a requirement, in any of many
 * words, or names a document must cite a card item, and must mention what that item asks for; the
 * letter may name no medicine from the catalogue that is not in the shipment. As for every AI
 * text, it follows the wording rules, mentions only the facts' codes, dates and numbers, and never
 * claims an approval. Otherwise it is not accepted and the blank template is shown, followed by the
 * same lists. Never throws.
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
  /** The trip's rule cards: those for every destination, then the country's. */
  readonly cards: readonly DestinationCard[];
  /** The card items whose documents are prepared. */
  readonly preparedItemIds: readonly string[];
  readonly medicines: readonly {
    readonly genericName: string;
    readonly strength: string | null;
    readonly quantity: number;
  }[];
  /** Every generic name in the medicine catalogue (DAT-101), so a medicine not shipped is caught. */
  readonly catalogueNames: ReadonlySet<string>;
}

const outputSchema = z.strictObject({
  sentences: z.array(
    z.strictObject({ text: z.string().min(1), cites: z.array(z.string()) }),
  ),
});

export type CoverLetterOutput = z.infer<typeof outputSchema>;

/** What the AI is told: ids, the cards' items and the medicines; never names (ARC-013). */
const factsOf = (input: CoverLetterInput) => ({
  tripId: input.tripId,
  arrivalDate: input.arrivalDate,
  cards: input.cards.map((card) => ({
    cardId: card.id,
    appliesTo: card.country ?? "every destination",
    items: card.items.map(({ id, requirement, document }) => ({
      id,
      requirement,
      document,
    })),
  })),
  medicines: input.medicines,
});

export const coverLetterStep: AiStep<CoverLetterInput, CoverLetterOutput> = {
  id: "AIC-102",
  tier: "strong",
  outputSchema,
  buildPrompt: (
    input,
  ) => `Write a short, plain covering letter from a mission medical team to go with this shipment of donated medicines. A person will review it.
Use only the facts below. Write the letter as sentences. A sentence that says what is required, or names a document, permit, licence, regulation, import or customs, lists in "cites" the id of each rule card item it relies on, and says what that item asks for; never state a requirement that is not one of the items. Do not write the checklist or the medicine list: code adds them after the letter. Name no medicine that is not in the facts. Mention only the codes, dates and numbers in the facts. ${WORDING_RULES} Never say that the shipment or anything in it is ${FORBIDDEN_IN_WORDS}: officials and the team decide.
Answer with JSON only, with no other text and no code fences, in this form:
{"sentences":[{"text":"<one plain sentence>","cites":["<item id>"]}]}

Facts:
${JSON.stringify(factsOf(input))}`,
};

/** Words that state a requirement, so the sentence must cite a card item. */
const REQUIREMENT_WORDS = [
  "must",
  "shall",
  "requir\\p{L}*",
  "mandatory",
  "obligatory",
  "compulsory",
  "necessary",
  "oblig\\p{L}*",
  "conditions?",
  "regist\\p{L}*",
  "ha(?:s|ve) to",
  "needs? to",
  "needed",
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

/** Words that name a document; the trip's cards add their own document names. */
const DOCUMENT_WORDS = [
  "certificat\\p{L}*",
  "declarations?",
  "invoices?",
  "permits?",
  "packing lists?",
];

const escape = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Words too common to show which item a sentence is about. */
const COMMON = new Set([
  "about",
  "after",
  "also",
  "before",
  "country",
  "donated",
  "donation",
  "each",
  "from",
  "have",
  "into",
  "medicine",
  "other",
  "prepared",
  "recipient",
  "shipment",
  "shipped",
  "shipping",
  "that",
  "their",
  "them",
  "there",
  "these",
  "they",
  "this",
  "which",
  "will",
  "with",
]);

/** The meaningful words of a text, in lower case and singular. */
const keyWords = (text: string): Set<string> =>
  new Set(
    (text.toLowerCase().match(/\p{L}{4,}/gu) ?? [])
      .filter((word) => !COMMON.has(word))
      .map((word) => word.replace(/s$/u, ""))
      .filter((word) => !COMMON.has(word)),
  );

/** The catalogue medicines named in the text, as written, longest name first at each place. */
function medicinesNamed(
  text: string,
  catalogue: ReadonlySet<string>,
): string[] {
  const words = text.match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu) ?? [];
  const found: string[] = [];
  for (let i = 0; i < words.length;) {
    const n = [6, 5, 4, 3, 2, 1].find((size) =>
      catalogue.has(
        words
          .slice(i, i + size)
          .join(" ")
          .toLowerCase(),
      ),
    );
    if (n === undefined) {
      i += 1;
    } else {
      found.push(words.slice(i, i + n).join(" "));
      i += n;
    }
  }
  return found;
}

export interface CoverLetterResult {
  readonly accepted: boolean;
  readonly problems: readonly string[];
  /** The letter and the lists to review; null when not accepted, and the template is shown. */
  readonly draft: Draft | null;
  /** The blank template: a place for the team's letter, then the same lists. */
  readonly template: string;
}

/** Checks a covering letter against the trip and its rule cards. Never throws. */
export function checkCoverLetter(
  input: CoverLetterInput,
  output: CoverLetterOutput,
): CoverLetterResult {
  const values = valuesIn(factsOf(input));
  const items = new Map(
    input.cards.flatMap((card) => card.items.map((item) => [item.id, item])),
  );
  const catalogue = new Set(
    [...input.catalogueNames].map((name) => name.toLowerCase()),
  );
  const shipped = input.medicines.map(
    (m) => ` ${m.genericName.toLowerCase()} `,
  );
  const needsCitation = [
    ...REQUIREMENT_WORDS,
    ...DOCUMENT_WORDS,
    ...[...items.values()].flatMap((item) =>
      item.document === null ? [] : [escape(item.document)],
    ),
  ];
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
    const sentenceWords = keyWords(text);
    for (const id of cites) {
      const item = items.get(id);
      if (item === undefined) {
        say(`cites ${id}, which is not on the trip's rule cards`);
      } else if (
        [...keyWords(`${item.requirement} ${item.document ?? ""}`)].every(
          (word) => !sentenceWords.has(word),
        )
      ) {
        say(`cites ${id} but does not mention what it asks for`);
      }
    }
    if (cites.length === 0 && wordsIn(text, needsCitation).length > 0) {
      say(
        "states a requirement or names a document without citing a rule card item",
      );
    }
    for (const name of medicinesNamed(text, catalogue)) {
      if (!shipped.some((m) => m.includes(` ${name.toLowerCase()} `))) {
        say(`names "${name}", which is not a medicine in this shipment`);
      }
    }
    for (const token of ungrounded(text, values)) {
      say(`mentions "${token}", which is not in the trip or the rule cards`);
    }
  }
  const letter = output.sentences.map((s) => s.text).join(" ");
  return {
    accepted: problems.length === 0,
    problems,
    draft:
      problems.length === 0
        ? newDraft("AIC-102", `${letter}\n\n${listsOf(input)}`)
        : null,
    template: coverLetterTemplate(input),
  };
}

/** The medicine list, then the checklists from the trip's rule cards, as built by code. */
function listsOf(
  input: Pick<CoverLetterInput, "medicines" | "cards" | "preparedItemIds">,
): string {
  const prepared = new Set(input.preparedItemIds);
  return [
    [
      "Medicines in this shipment:",
      ...input.medicines.map(
        (m) =>
          `${m.genericName}${m.strength === null ? "" : ` ${m.strength}`}: ${String(m.quantity)}`,
      ),
    ],
    ...input.cards.map((card) => checklist(card, prepared)),
  ]
    .map((lines) => lines.join("\n"))
    .join("\n\n");
}

/**
 * The blank template, for when there is no accepted AI draft: a place for the team's letter, then
 * the medicine list and the checklists (SYS-009; TC-143). The same text the check shows when a
 * draft is not accepted.
 */
export function coverLetterTemplate(
  input: Pick<CoverLetterInput, "medicines" | "cards" | "preparedItemIds">,
): string {
  return `[Covering letter: the team writes it here.]\n\n${listsOf(input)}`;
}
