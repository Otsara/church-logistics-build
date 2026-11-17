// AIC-102: the covering letter for a medicine shipment (SYS-004, SYS-005; TC-007, TC-008). Code
// builds the checklist from the destination's rule card; the AI writes only the letter, and any
// sentence that states a requirement must cite a card item (owner, 2026-11-16; ADR-039, ADR-042).
// AI answers below are hand-written fixtures.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  SYNTHETIC_CARD_LABEL,
  checklist,
  readDestinationCard,
} from "@church-logistics/core";
import { describe, expect, it } from "vitest";
import {
  checkCoverLetter,
  coverLetterStep,
  type CoverLetterInput,
} from "../src/steps/cover-letter.ts";
import { DRAFT_LABEL, FORBIDDEN_IN_WORDS } from "../src/steps/drafts.ts";
import { WORDING_RULES } from "../src/steps/wording.ts";

const read = readDestinationCard(
  readFileSync(
    join(
      import.meta.dirname,
      "../../../rules/prepped/destination-honduras.json",
    ),
    "utf8",
  ),
);
if (!read.ok) throw new Error(read.errors.join("; "));
const card = read.card;

const INPUT: CoverLetterInput = {
  tripId: "TRIP-01",
  arrivalDate: "2026-12-01",
  card,
  preparedItemIds: ["HN-01"],
  medicines: [
    { genericName: "Amoxicillin", strength: "500 mg", quantity: 120 },
    { genericName: "Paracetamol", strength: null, quantity: 300 },
  ],
};

const cite = (text: string, cites: string[] = []) => ({ text, cites });
const CHECKLIST = checklist(card, new Set(["HN-01"])).join("\n");

describe("Covering letter (AIC-102)", () => {
  it("[TC-007, TC-008] Given a letter whose requirements all cite the rule card, then it is accepted as a draft: the letter, then the checklist built by code", () => {
    const sentences = [
      cite(
        "Dear colleagues, we write about trip TRIP-01, arriving 2026-12-01.",
      ),
      cite("We enclose the import permit, as the card asks (HN-01).", [
        "HN-01",
      ]),
      cite("The shipment holds 120 Amoxicillin 500 mg and 300 Paracetamol."),
    ];
    const result = checkCoverLetter(INPUT, { sentences });
    const letter = sentences.map((s) => s.text).join(" ");
    expect(result).toEqual({
      accepted: true,
      problems: [],
      draft: {
        stepId: "AIC-102",
        text: `${letter}\n\n${CHECKLIST}`,
        label: DRAFT_LABEL,
        reviewed: null,
      },
      template: `[Covering letter: the team writes it here.]\n\n${CHECKLIST}`,
    });
    expect(CHECKLIST).toContain(SYNTHETIC_CARD_LABEL);
    expect(CHECKLIST).toContain("Import permit: prepared.");
    expect(CHECKLIST).toContain("Donation letter: missing.");
  });

  it("[TC-007] Given a sentence that states a requirement without citing the card, or cites an item not on it, then the letter is not accepted and the blank template is shown", () => {
    const result = checkCoverLetter(INPUT, {
      sentences: [
        cite("An import permit is required."),
        cite("A health certificate is needed too.", ["HN-09"]),
        cite("Customs must see 2 copies."),
      ],
    });
    expect(result.accepted).toBe(false);
    expect(result.draft).toBeNull();
    expect(result.template).toBe(
      `[Covering letter: the team writes it here.]\n\n${CHECKLIST}`,
    );
    expect(result.problems).toEqual([
      "sentence 1 states a requirement without citing a rule card item",
      "sentence 2 cites HN-09, which is not on rule card destination-honduras",
      "sentence 3 states a requirement without citing a rule card item",
      'sentence 3 mentions "2", which is not in the trip or the rule card',
    ]);
    expect(checkCoverLetter(INPUT, { sentences: [] }).problems).toEqual([
      "the letter is empty",
    ]);
  });

  it("[SYS-309, TC-007] Given a letter that claims a clearance, uses a relative date or adds a figure, then it is not accepted", () => {
    expect(
      checkCoverLetter(INPUT, {
        sentences: [
          cite("The shipment is cleared for import (HN-01).", ["HN-01"]),
          cite("It arrives tomorrow with 50 boxes."),
          cite("Two pallets are needed."),
        ],
      }).problems,
    ).toEqual([
      'sentence 1 says "cleared": nothing here approves anything',
      'sentence 2 says "tomorrow": use the dates given',
      'sentence 2 mentions "50", which is not in the trip or the rule card',
      'sentence 3 writes "Two" in words: numbers are written in digits',
      "sentence 3 states a requirement without citing a rule card item",
    ]);
  });

  it("[AIC-102] Given the trip, then the prompt gives the card's items with their ids and asks for citations, the wording rules and no checklist", () => {
    const prompt = coverLetterStep.buildPrompt(INPUT);
    expect(coverLetterStep).toMatchObject({ id: "AIC-102", tier: "strong" });
    expect(prompt).toContain('"cardId":"destination-honduras"');
    expect(prompt).toContain('"id":"HN-01"');
    expect(prompt).toContain('"tripId":"TRIP-01"');
    expect(prompt).toMatch(/cites/);
    expect(prompt).toContain(FORBIDDEN_IN_WORDS);
    expect(prompt).toContain(WORDING_RULES);
    expect(prompt).toMatch(/do not write the checklist/i);
    const schema = coverLetterStep.outputSchema;
    expect(
      schema.safeParse({ sentences: [{ text: "Hi.", cites: [] }] }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ sentences: [{ text: "", cites: [] }] }).success,
    ).toBe(false);
    expect(schema.safeParse({ sentences: [], extra: true }).success).toBe(
      false,
    );
  });
});
