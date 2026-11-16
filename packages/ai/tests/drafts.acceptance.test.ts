// Drafts and explanations (AIC-103, AIC-302, AIC-303; SYS-003, SYS-005, SYS-309): explanations
// may only restate computed results, drafts are marked until a person reviews them, and nothing
// claims an approval (owner, 2026-11-16; ADR-039). AI answers below are hand-written fixtures.
import { describe, expect, it } from "vitest";
import {
  DRAFT_LABEL,
  forbiddenClaims,
  markReviewed,
  newDraft,
} from "../src/steps/drafts.ts";
import {
  checkExplanation,
  explainPlanStep,
  explainReadinessStep,
  planFacts,
  readinessFacts,
  type Fact,
} from "../src/steps/explain.ts";
import { checkMessage, messageStep } from "../src/steps/message.ts";

const FACTS: readonly Fact[] = [
  { ref: "indicator", values: { indicator: "No go" } },
  {
    ref: "F1",
    values: {
      name: "Amoxicillin",
      status: "short",
      target: 300,
      covered: 225,
      short: 75,
      coverage: 75,
    },
  },
  {
    ref: "F2",
    values: {
      name: "Ibuprofen",
      status: "covered",
      target: 100,
      covered: 100,
      short: 0,
      coverage: 100,
    },
  },
  { ref: "DOC-1", values: { name: "Packing list", reason: "not prepared" } },
];

const say = (text: string, refs: string[]) => ({ text, refs });

describe("Explanations restate only computed results (TC-010)", () => {
  it("[TC-010] Given sentences whose ids, numbers and statuses are all in the items they name, then the explanation is accepted", () => {
    const result = checkExplanation(FACTS, {
      sentences: [
        say("The indicator shows No go.", ["indicator"]),
        say(
          "Amoxicillin (F1) is short by 75 of a target of 300, 75% covered.",
          ["F1"],
        ),
        say("The packing list (DOC-1) is not prepared.", ["DOC-1"]),
      ],
    });
    expect(result).toEqual({
      accepted: true,
      problems: [],
      text: "The indicator shows No go. Amoxicillin (F1) is short by 75 of a target of 300, 75% covered. The packing list (DOC-1) is not prepared.",
    });
  });

  it("[TC-010] Given a sentence with a number, status or id not in the items it names, or naming an item that does not exist, then the explanation is rejected and the computed list is shown instead", () => {
    const result = checkExplanation(FACTS, {
      sentences: [
        say("Amoxicillin (F1) is short by 80.", ["F1"]),
        say("Ibuprofen is short.", ["F2"]),
        say("F3 is covered.", ["F3"]),
        say("Amoxicillin shares stock with F2.", ["F1"]),
        say("The trip shows Go.", ["indicator"]),
        say("Done by 2026-12-01.", ["F1"]),
        say("All set.", []),
      ],
    });
    expect(result.accepted).toBe(false);
    expect(result.text).toBeNull();
    expect(result.problems).toEqual([
      'sentence 1 mentions "80", which is not in the items it names',
      'sentence 2 says "short", which is not the status of the items it names',
      "sentence 3 names F3, which is not in the computed results",
      'sentence 4 mentions "F2", which is not in the items it names',
      'sentence 5 says "go", which is not the status of the items it names',
      'sentence 6 mentions "2026-12-01", which is not in the items it names',
      "sentence 7 names no computed item",
    ]);
    expect(checkExplanation(FACTS, { sentences: [] })).toMatchObject({
      accepted: false,
      problems: ["the explanation is empty"],
    });
  });

  it("[SYS-309] Given an explanation that claims an approval or airworthiness, then it is rejected", () => {
    const result = checkExplanation(FACTS, {
      sentences: [say("Ibuprofen (F2) is covered and approved.", ["F2"])],
    });
    expect(result.problems).toEqual([
      'sentence 1 says "approved": nothing here approves anything',
    ]);
  });

  it("[AIC-103] Given a floor assessment, then the facts list the indicator, each item with its status and amounts, and each missing document", () => {
    const facts = readinessFacts({
      indicator: "No go",
      items: [
        {
          floorItemId: "F1",
          genericName: "Amoxicillin",
          status: "needs_review",
          target: 300,
          covered: 225,
          short: null,
          coverage: 0,
        },
      ],
      missingDocuments: [
        { documentId: "DOC-1", name: "Packing list", reason: "not prepared" },
      ],
      problems: [
        "no floor items chosen: the lead clinician picks the floor list",
      ],
    });
    expect(facts).toEqual([
      { ref: "indicator", values: { indicator: "No go" } },
      {
        ref: "F1",
        values: {
          name: "Amoxicillin",
          status: "needs review",
          target: 300,
          covered: 225,
          short: null,
          coverage: 0,
        },
      },
      {
        ref: "DOC-1",
        values: { name: "Packing list", reason: "not prepared" },
      },
      {
        ref: "problem-1",
        values: {
          problem:
            "no floor items chosen: the lead clinician picks the floor list",
        },
      },
    ]);
    const prompt = explainReadinessStep.buildPrompt({ facts });
    expect(prompt).toContain('"ref":"F1"');
    expect(prompt).toMatch(/gaps/);
    expect(explainReadinessStep).toMatchObject({
      id: "AIC-103",
      tier: "strong",
    });
  });

  it("[AIC-303] Given a ranked plan, then the facts list each option with its rank, whether it is proposed, missed flights, return to service, transfers and cost", () => {
    const facts = planFacts([
      {
        rank: 1,
        proposed: true,
        option: {
          id: "OPT-A",
          missedFlights: 0,
          returnToService: "2026-11-19",
          transfers: 1,
          cost: "USD 400",
        },
      },
      {
        rank: 2,
        proposed: false,
        option: {
          id: "OPT-B",
          missedFlights: null,
          returnToService: null,
          transfers: 0,
          cost: null,
        },
      },
    ]);
    expect(facts).toEqual([
      {
        ref: "OPT-A",
        values: {
          rank: 1,
          status: "proposed",
          missedFlights: 0,
          returnToService: "2026-11-19",
          transfers: 1,
          cost: "USD 400",
        },
      },
      {
        ref: "OPT-B",
        values: {
          rank: 2,
          status: "not proposed",
          missedFlights: "unknown",
          returnToService: "unknown",
          transfers: 0,
          cost: null,
        },
      },
    ]);
    expect(
      checkExplanation(facts, {
        sentences: [
          say(
            "OPT-A is proposed: 0 missed flights, back by 2026-11-19, 1 transfer, USD 400.",
            ["OPT-A"],
          ),
        ],
      }).accepted,
    ).toBe(true);
    expect(explainPlanStep).toMatchObject({ id: "AIC-303", tier: "strong" });
    expect(explainPlanStep.buildPrompt({ facts })).toContain('"ref":"OPT-B"');
  });

  it("[TC-010] Given the schema, then an answer without sentences or with an extra field is refused", () => {
    expect(
      explainReadinessStep.outputSchema.safeParse({
        sentences: [say("x", ["F1"])],
      }).success,
    ).toBe(true);
    expect(
      explainReadinessStep.outputSchema.safeParse({
        sentences: [{ ...say("x", ["F1"]), extra: 1 }],
      }).success,
    ).toBe(false);
    expect(
      explainReadinessStep.outputSchema.safeParse({ text: "x" }).success,
    ).toBe(false);
  });
});

describe("Drafts are marked until a person reviews them (TC-008)", () => {
  it("[TC-008] Given a new draft, then it shows the draft label and no reviewer; marking it reviewed records who and when in the audit log", () => {
    const draft = newDraft("AIC-302", "Hello base B02.");
    expect(draft).toEqual({
      stepId: "AIC-302",
      text: "Hello base B02.",
      label: DRAFT_LABEL,
      reviewed: null,
    });
    expect(DRAFT_LABEL).toBe("Draft, human review required");
    const { draft: done, entry } = markReviewed(
      draft,
      "PER-7",
      "2026-11-16T20:00:00Z",
    );
    expect(done).toEqual({
      ...draft,
      label: null,
      reviewed: { personId: "PER-7", time: "2026-11-16T20:00:00Z" },
    });
    expect(entry).toEqual({
      time: "2026-11-16T20:00:00Z",
      actor: { kind: "person", personId: "PER-7" },
      action: "draft from AIC-302 marked reviewed",
      before: { label: DRAFT_LABEL },
      after: { reviewed: true },
    });
  });

  it("[SYS-309] Given text, then every word claiming an approval or airworthiness is listed, whatever its case", () => {
    expect(
      forbiddenClaims(
        "Approved. The aircraft is airworthy, FLIGHTWORTHY and safe to fly; cleared for use.",
      ),
    ).toEqual([
      "approved",
      "airworthy",
      "flightworthy",
      "safe to fly",
      "cleared",
    ]);
    expect(forbiddenClaims("A plan for the director to review")).toEqual([]);
  });
});

const DISRUPTION = {
  disruptionId: "DIS01",
  aircraftId: "SW-A01",
  start: "2026-11-17",
  expectedEnd: "2026-11-20",
  candidate: {
    kind: "part" as const,
    id: "P001",
    partNumber: "SWP-1155-6",
    sourceBaseId: "B03",
    eta: "2026-11-19",
  },
  to: { kind: "base" as const, id: "B03" },
};

describe("Messages to bases and communities (AIC-302, TC-310)", () => {
  it("[TC-310] Given a disruption and a chosen candidate, then the message comes back as a draft that a person sends, and the prompt carries ids only", () => {
    const prompt = messageStep.buildPrompt(DISRUPTION);
    expect(prompt).toContain('"aircraftId":"SW-A01"');
    expect(prompt).toMatch(/never say the aircraft is approved/i);
    expect(messageStep).toMatchObject({ id: "AIC-302", tier: "strong" });
    const result = checkMessage(DISRUPTION, {
      message:
        "Base B03: please send part SWP-1155-6 for SW-A01; we expect it by 2026-11-19.",
    });
    expect(result).toEqual({
      accepted: true,
      problems: [],
      draft: newDraft(
        "AIC-302",
        "Base B03: please send part SWP-1155-6 for SW-A01; we expect it by 2026-11-19.",
      ),
      sending:
        "a person reviews and sends this message; it is never sent automatically",
    });
  });

  it("[TC-310] Given a message with an id, date or number not in the disruption, or claiming an approval, then it is not accepted and the blank template is shown", () => {
    const result = checkMessage(DISRUPTION, {
      message: "SW-A02 is approved to fly from 2026-11-18 with 3 parts.",
    });
    expect(result.accepted).toBe(false);
    expect(result.draft).toBeNull();
    expect(result.problems).toEqual([
      'the message says "approved": nothing here approves anything',
      'the message mentions "SW-A02", which is not in the disruption',
      'the message mentions "2026-11-18", which is not in the disruption',
      'the message mentions "3", which is not in the disruption',
    ]);
    expect(messageStep.outputSchema.safeParse({ message: "" }).success).toBe(
      false,
    );
  });
});

describe("Grounding details (TC-010)", () => {
  const fact = (values: Fact["values"]): Fact[] => [{ ref: "F9", values }];
  const check = (text: string, values: Fact["values"]) =>
    checkExplanation(fact(values), { sentences: [say(text, ["F9"])] }).problems;

  it("[TC-010] Given decimals and codes with dots, then they must match whole: 2.5 is not 2.55, and A1.5 is not A1x5", () => {
    expect(check("F9 has 2.5 left.", { left: 2.5 })).toEqual([]);
    expect(check("F9 has 2.55 left.", { left: 2.5 })).toEqual([
      'sentence 1 mentions "2.55", which is not in the items it names',
    ]);
    expect(check("F9 has 2.5 left.", { left: 2.55 })).toEqual([
      'sentence 1 mentions "2.5", which is not in the items it names',
    ]);
    expect(check("F9 is lot 1.5.", { lot: "1x5" })).toEqual([
      'sentence 1 mentions "1.5", which is not in the items it names',
    ]);
    // Letter case does not matter; a code written inside a longer value counts.
    expect(check("f9 uses part swp-1155-6.", { part: "SWP-1155-6" })).toEqual(
      [],
    );
    expect(
      check("F9 is in the Packing list.", { name: "Packing list" }),
    ).toEqual([]);
  });

  it('[TC-010] Given an amount written before "covered" or "short", then it is read as a figure, not a status; the word alone is a status', () => {
    const values = {
      status: "needs review",
      covered: 225,
      short: 2.5,
      coverage: 75,
    };
    expect(
      check("F9 needs review: 225 covered, 2.5 short, 75 % covered.", values),
    ).toEqual([]);
    expect(check("F9 needs review: 75%  covered.", values)).toEqual([]);
    expect(check("F9 is covered.", values)).toEqual([
      'sentence 1 says "covered", which is not the status of the items it names',
    ]);
    expect(
      checkExplanation(FACTS, {
        sentences: [say("No go now, and No go later.", ["indicator"])],
      }).accepted,
    ).toBe(true);
  });

  it("[AIC-103, AIC-303] Given coverage as a fraction, then the facts show it as a percentage; both prompts list every forbidden claim", () => {
    const [, item] = readinessFacts({
      indicator: "Go",
      items: [
        {
          floorItemId: "F1",
          genericName: "Amoxicillin",
          status: "short",
          target: 300,
          covered: 225,
          short: 75,
          coverage: 0.75,
        },
      ],
      missingDocuments: [],
      problems: [],
    });
    expect(item?.values.coverage).toBe(75);
    const words = "approved, airworthy, flightworthy, safe to fly or cleared";
    expect(explainReadinessStep.buildPrompt({ facts: FACTS })).toContain(words);
    expect(explainPlanStep.buildPrompt({ facts: FACTS })).toContain(words);
    expect(explainPlanStep.buildPrompt({ facts: FACTS })).toMatch(/ranked/);
  });

  it("[TC-010] Given the answer schema, then a sentence must have text, and may be long", () => {
    const schema = explainReadinessStep.outputSchema;
    expect(
      schema.safeParse({ sentences: [{ text: "", refs: ["F1"] }] }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        sentences: [{ text: "A longer sentence.", refs: ["F1"] }],
      }).success,
    ).toBe(true);
  });
});
