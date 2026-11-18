// AIC-102: the covering letter for a medicine shipment (SYS-004, SYS-005, SYS-120; TC-007, TC-008,
// TC-139). Code builds the medicine list and the checklists from the trip and its rule cards (the
// WHO card for every destination, then the country's); the AI writes only the letter, and any
// sentence that states a requirement or names a document must cite a card item it mentions
// (owner, 2026-11-16 and 2026-11-17; ADR-039, ADR-042, ADR-044). AI answers below are hand-written
// fixtures.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  SYNTHETIC_CARD_LABEL,
  checklist,
  readDestinationCard,
  type DestinationCard,
} from "@church-logistics/core";
import { describe, expect, it } from "vitest";
import {
  checkCoverLetter,
  coverLetterStep,
  type CoverLetterInput,
} from "../src/steps/cover-letter.ts";
import { DRAFT_LABEL, FORBIDDEN_IN_WORDS } from "../src/steps/drafts.ts";
import { WORDING_RULES } from "../src/steps/wording.ts";

const readCard = (name: string): DestinationCard => {
  const result = readDestinationCard(
    readFileSync(
      join(import.meta.dirname, `../../../rules/prepped/${name}.json`),
      "utf8",
    ),
  );
  if (!result.ok) throw new Error(result.errors.join("; "));
  return result.card;
};
const who = readCard("who-donation-guidelines");
const honduras = readCard("destination-honduras");

const INPUT: CoverLetterInput = {
  tripId: "TRIP-01",
  arrivalDate: "2026-12-01",
  cards: [who, honduras],
  preparedItemIds: ["HN-01"],
  medicines: [
    { genericName: "Amoxicillin", strength: "500 mg", quantity: 120 },
    { genericName: "Paracetamol", strength: null, quantity: 300 },
  ],
  catalogueNames: new Set([
    "Amoxicillin",
    "Amoxicillin and Clavulanate Potassium",
    "Paracetamol",
    "Morphine Sulfate",
    "Morphine",
    "Diazepam",
    "Co-trimoxazole",
  ]),
};

const cite = (text: string, cites: string[] = []) => ({ text, cites });
const problems = (...sentences: { text: string; cites: string[] }[]) =>
  checkCoverLetter(INPUT, { sentences }).problems;

const prepared = new Set(["HN-01"]);
const AFTER_LETTER = [
  "Medicines in this shipment:",
  "Amoxicillin 500 mg: 120",
  "Paracetamol: 300",
  "",
  ...checklist(who, prepared),
  "",
  ...checklist(honduras, prepared),
].join("\n");

describe("Covering letter (AIC-102)", () => {
  it("[TC-007, TC-008] Given a letter whose requirements all cite a rule card item they mention, then it is accepted as a draft: the letter, then the medicine list and the checklists built by code", () => {
    const sentences = [
      cite(
        "Dear colleagues, we write about trip TRIP-01, arriving 2026-12-01.",
      ),
      cite("We enclose the import permit, as the card asks (HN-01).", [
        "HN-01",
      ]),
      cite("The recipient consented to this shipment (WHO-01).", ["WHO-01"]),
      cite("The shipment holds 120 Amoxicillin 500 mg and 300 Paracetamol."),
    ];
    const result = checkCoverLetter(INPUT, { sentences });
    const letter = sentences.map((s) => s.text).join(" ");
    expect(result).toEqual({
      accepted: true,
      problems: [],
      draft: {
        stepId: "AIC-102",
        text: `${letter}\n\n${AFTER_LETTER}`,
        label: DRAFT_LABEL,
        reviewed: null,
      },
      template: `[Covering letter: the team writes it here.]\n\n${AFTER_LETTER}`,
    });
    expect(AFTER_LETTER).toContain(SYNTHETIC_CARD_LABEL);
    expect(AFTER_LETTER).toContain("Import permit: prepared.");
    expect(AFTER_LETTER).toContain("Donation letter: missing.");
    expect(AFTER_LETTER).toContain(
      "Checklist from rule card who-donation-guidelines (every destination).",
    );
  });

  it("[TC-007] Given a sentence that states a requirement without citing a card, or cites an item on none of the trip's cards, then the letter is not accepted and the blank template is shown", () => {
    const result = checkCoverLetter(INPUT, {
      sentences: [
        cite("An import permit is required."),
        cite("A health certificate is needed too.", ["HN-09"]),
        cite("Customs must see 3 copies."),
      ],
    });
    expect(result.accepted).toBe(false);
    expect(result.draft).toBeNull();
    expect(result.template).toBe(
      `[Covering letter: the team writes it here.]\n\n${AFTER_LETTER}`,
    );
    expect(result.problems).toEqual([
      "sentence 1 states a requirement or names a document without citing a rule card item",
      "sentence 2 cites HN-09, which is not on the trip's rule cards",
      "sentence 3 states a requirement or names a document without citing a rule card item",
      'sentence 3 mentions "3", which is not in the trip or the rule cards',
    ]);
    expect(checkCoverLetter(INPUT, { sentences: [] }).problems).toEqual([
      "the letter is empty",
    ]);
  });

  it("[SYS-309, TC-007] Given a letter that claims a clearance, uses a relative date or adds a figure, then it is not accepted", () => {
    expect(
      problems(
        cite("The shipment is cleared for import (HN-01).", ["HN-01"]),
        cite("It arrives tomorrow with 50 boxes."),
        cite("Two pallets are needed."),
      ),
    ).toEqual([
      'sentence 1 says "cleared": nothing here approves anything',
      'sentence 2 says "tomorrow": use the dates given',
      'sentence 2 mentions "50", which is not in the trip or the rule cards',
      'sentence 3 writes "Two" in words: numbers are written in digits',
      "sentence 3 states a requirement or names a document without citing a rule card item",
    ]);
  });

  it("[AIC-102] Given the trip, then the prompt gives each card's items with their ids and asks for citations, the wording rules and no lists", () => {
    const prompt = coverLetterStep.buildPrompt(INPUT);
    expect(coverLetterStep).toMatchObject({ id: "AIC-102", tier: "strong" });
    expect(prompt).toContain('"cardId":"destination-honduras"');
    expect(prompt).toContain('"cardId":"who-donation-guidelines"');
    expect(prompt).toContain('"id":"HN-01"');
    expect(prompt).toContain('"id":"WHO-01"');
    expect(prompt).toContain('"appliesTo":"every destination"');
    expect(prompt).toContain('"appliesTo":"Honduras"');
    expect(prompt).toContain('"tripId":"TRIP-01"');
    expect(prompt).not.toContain("Morphine");
    expect(prompt).toMatch(/cites/);
    expect(prompt).toContain(FORBIDDEN_IN_WORDS);
    expect(prompt).toContain(WORDING_RULES);
    expect(prompt).toMatch(/do not write the checklist or the medicine list/i);
    expect(prompt).toMatch(/name no medicine that is not in the facts/i);
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

describe("Covering letter after the owner's review (REV-012 part 2)", () => {
  it("[TC-007] Given a requirement in other words, then it must cite a card item", () => {
    for (const text of [
      "Donated medicines have to be registered.",
      "Registration is compulsory and necessary.",
      "We are obliged to meet these conditions.",
      "The clinic has to sign for it.",
    ]) {
      expect(problems(cite(text)), text).toEqual([
        "sentence 1 states a requirement or names a document without citing a rule card item",
      ]);
    }
  });

  it("[TC-007] Given a sentence that names a document, on a card or not, then it must cite a card item; the letter itself is not a document", () => {
    for (const text of [
      "We also enclose a phytosanitary certificate.",
      "The donation letter is attached.",
      "A pro forma invoice and a declaration go with it.",
    ]) {
      expect(problems(cite(text)), text).toEqual([
        "sentence 1 states a requirement or names a document without citing a rule card item",
      ]);
    }
    expect(problems(cite("This letter covers trip TRIP-01."))).toEqual([]);
  });

  it("[TC-139] Given a letter that names a medicine from the catalogue that is not in the shipment, then it is not accepted; a medicine in the shipment, or part of its name, is fine", () => {
    expect(problems(cite("We also send Morphine and Diazepam."))).toEqual([
      'sentence 1 names "Morphine", which is not a medicine in this shipment',
      'sentence 1 names "Diazepam", which is not a medicine in this shipment',
    ]);
    expect(problems(cite("We send morphine sulfate."))).toEqual([
      'sentence 1 names "morphine sulfate", which is not a medicine in this shipment',
    ]);
    expect(problems(cite("The amoxicillin is for the clinic."))).toEqual([]);
    expect(problems(cite("We add Co-trimoxazole."))).toEqual([
      'sentence 1 names "Co-trimoxazole", which is not a medicine in this shipment',
    ]);
    const combined = checkCoverLetter(
      {
        ...INPUT,
        medicines: [
          {
            genericName: "Amoxicillin and Clavulanate Potassium",
            strength: null,
            quantity: 40,
          },
        ],
      },
      { sentences: [cite("The Amoxicillin is for children.")] },
    );
    expect(combined.problems).toEqual([]);
  });

  it("[TC-007] Given a sentence that cites an item without mentioning what it asks for, then it is not accepted", () => {
    expect(
      problems(
        cite("Controlled medicines are not shipped (HN-01).", ["HN-01"]),
      ),
    ).toEqual(["sentence 1 cites HN-01 but does not mention what it asks for"]);
    expect(
      problems(
        cite("Controlled medicines are not shipped (HN-04).", ["HN-04"]),
      ),
    ).toEqual([]);
    expect(
      problems(cite("We enclose the permits (HN-01).", ["HN-01"])),
    ).toEqual([]);
    // Words common to many items do not show which item a sentence is about.
    const common =
      "about after also before country donated donation each from have into medicine other prepared recipient shipment shipped shipping that their them there these they this which will with";
    const card: DestinationCard = {
      ...honduras,
      items: [
        {
          id: "HN-01",
          requirement: `${common} distinctive.`,
          document: null,
          label: SYNTHETIC_CARD_LABEL,
        },
      ],
    };
    const only = (text: string) =>
      checkCoverLetter(
        { ...INPUT, cards: [card] },
        { sentences: [cite(text, ["HN-01"])] },
      ).problems;
    expect(only(`${common} (HN-01).`)).toEqual([
      "sentence 1 cites HN-01 but does not mention what it asks for",
    ]);
    expect(only("Distinctive (HN-01).")).toEqual([]);
    // A sentence with no meaningful word, or no word at all, mentions no item.
    expect(problems(cite("OK (HN-01).", ["HN-01"]))).toEqual([
      "sentence 1 cites HN-01 but does not mention what it asks for",
    ]);
    expect(problems(cite("…"))).toEqual([]);
  });
});
