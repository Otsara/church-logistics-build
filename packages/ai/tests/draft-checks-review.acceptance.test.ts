// The owner's line-by-line review of the AI drafts and explanations (REV-011; owner, 2026-11-17;
// ADR-040): the forbidden claims in any spelling, reviews and edits recorded properly,
// explanations about one item each with figures taken whole, and messages without relative
// dates, invented people or promises. AI answers below are hand-written fixtures.
import { describe, expect, it } from "vitest";
import {
  DRAFT_LABEL,
  FORBIDDEN_IN_WORDS,
  editDraft,
  forbiddenClaims,
  markReviewed,
  newDraft,
} from "../src/steps/drafts.ts";
import {
  checkExplanation,
  explainPlanStep,
  readinessFacts,
  type Fact,
} from "../src/steps/explain.ts";
import { checkMessage, messageStep } from "../src/steps/message.ts";

const say = (text: string, refs: string[]) => ({ text, refs });

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
      missedFlights: 2,
      returnToService: "2026-11-21",
      transfers: 0,
      cost: null,
    },
  },
];

const problems = (text: string, refs: string[]) =>
  checkExplanation(FACTS, { sentences: [say(text, refs)] }).problems;

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

const messageProblems = (message: string) =>
  checkMessage(DISRUPTION, { message }).problems;

describe("Forbidden claims in any spelling (REV-011 part 1)", () => {
  it("[SYS-309] Given a forbidden claim written with hyphens, extra spaces or in another form of the word, then it is found as written", () => {
    expect(
      forbiddenClaims(
        "Flight-worthy, safe-to-fly and safe  to fly; awaiting approval; we approve; airworthiness.",
      ),
    ).toEqual([
      "approval",
      "approve",
      "airworthiness",
      "flight-worthy",
      "safe-to-fly",
      "safe  to fly",
    ]);
    expect(
      forbiddenClaims(
        "Approves, approving, Cleared, clearance, flight worthy, ready to fly, ready-to-fly, fit to fly, fit for flight.",
      ),
    ).toEqual([
      "approves",
      "approving",
      "flight worthy",
      "cleared",
      "clearance",
      "ready to fly",
      "ready-to-fly",
      "fit to fly",
      "fit for flight",
    ]);
    // Everyday words that only look alike are not claims.
    expect(
      forbiddenClaims(
        "It is clear that the plan is ready for review; the reader is fit and well; unapproved is not a word we use.",
      ),
    ).toEqual([]);
  });

  it('[SYS-309] Given the prompts, then they list every forbidden claim, including "ready to fly" and "fit to fly"', () => {
    expect(FORBIDDEN_IN_WORDS).toBe(
      "approved, airworthy, flightworthy, safe to fly, cleared, ready to fly or fit to fly",
    );
    expect(messageStep.buildPrompt(DISRUPTION)).toContain(FORBIDDEN_IN_WORDS);
    expect(explainPlanStep.buildPrompt({ facts: FACTS })).toContain(
      FORBIDDEN_IN_WORDS,
    );
    expect(
      messageProblems("SW-A01 will be ready to fly on 2026-11-20."),
    ).toEqual([
      'the message says "ready to fly": nothing here approves anything',
    ]);
  });
});

describe("Reviews and edits are recorded properly (REV-011 part 1)", () => {
  const draft = newDraft("AIC-302", "Hello base B03.");

  it("[TC-008] Given no person, or a time that is not a valid UTC date and time, then marking the draft reviewed is refused", () => {
    expect(markReviewed(draft, "  ", "2026-11-17T09:00:00Z")).toEqual({
      ok: false,
      reason: "the person marking the draft reviewed is not identified",
    });
    for (const time of [
      "not a time",
      "2026-11-17",
      "2026-02-30T09:00:00Z",
      "2026-11-17T24:00:00Z",
      "2026-11-17T09:00:00+01:00",
    ]) {
      expect(markReviewed(draft, "PER-7", time), time).toEqual({
        ok: false,
        reason:
          "the time is not a valid UTC date and time (YYYY-MM-DDTHH:MM:SSZ)",
      });
    }
  });

  it("[TC-008] Given a draft already marked reviewed, then a second mark is refused and the first reviewer is kept", () => {
    const first = markReviewed(draft, "PER-7", "2026-11-17T09:00:00Z");
    if (!first.ok) throw new Error(first.reason);
    expect(markReviewed(first.draft, "PER-9", "2026-11-17T10:00:00Z")).toEqual({
      ok: false,
      reason:
        "the draft was already marked reviewed by PER-7 at 2026-11-17T09:00:00Z",
    });
  });

  it("[TC-008] Given an edit to a reviewed draft, then the label comes back, the review is cleared, and the edit is recorded in the audit log", () => {
    const first = markReviewed(draft, "PER-7", "2026-11-17T09:00:00Z");
    if (!first.ok) throw new Error(first.reason);
    const edited = editDraft(
      first.draft,
      "Hello base B03, please call.",
      "PER-9",
      "2026-11-17T10:00:00Z",
    );
    expect(edited).toEqual({
      ok: true,
      draft: {
        stepId: "AIC-302",
        text: "Hello base B03, please call.",
        label: DRAFT_LABEL,
        reviewed: null,
      },
      entry: {
        time: "2026-11-17T10:00:00Z",
        actor: { kind: "person", personId: "PER-9" },
        action: "draft from AIC-302 edited: needs review again",
        before: { text: "Hello base B03.", reviewed: true },
        after: { text: "Hello base B03, please call.", label: DRAFT_LABEL },
      },
    });
    if (!edited.ok) throw new Error(edited.reason);
    // The edited draft can be marked reviewed again.
    expect(markReviewed(edited.draft, "PER-7", "2026-11-17T11:00:00Z").ok).toBe(
      true,
    );
    // An edit to a draft not yet reviewed is recorded the same way.
    expect(
      editDraft(draft, "Hi.", "PER-9", "2026-11-17T10:00:00Z"),
    ).toMatchObject({ ok: true, entry: { before: { reviewed: false } } });
  });

  it("[TC-008] Given an edit with no person, an invalid time or no text, then it is refused", () => {
    expect(editDraft(draft, "Hi.", "  ", "2026-11-17T10:00:00Z")).toEqual({
      ok: false,
      reason: "the person editing the draft is not identified",
    });
    expect(editDraft(draft, "Hi.", "PER-9", "yesterday")).toEqual({
      ok: false,
      reason:
        "the time is not a valid UTC date and time (YYYY-MM-DDTHH:MM:SSZ)",
    });
    expect(editDraft(draft, "  ", "PER-9", "2026-11-17T10:00:00Z")).toEqual({
      ok: false,
      reason: "the edited draft is empty",
    });
  });
});

describe("Explanations: one item per sentence, figures taken whole (REV-011 part 2)", () => {
  it("[TC-010] Given a number that is only a piece of a date or code in the facts, then it is not accepted; a figure standing alone in a text value is", () => {
    expect(problems("OPT-A means 19 missed flights.", ["OPT-A"])).toEqual([
      'sentence 1 mentions "19", which is not in the items it names',
    ]);
    expect(problems("OPT-A costs USD 2026.", ["OPT-A"])).toEqual([
      'sentence 1 mentions "2026", which is not in the items it names',
    ]);
    expect(problems("OPT-A costs USD 400.", ["OPT-A"])).toEqual([]);
    expect(problems("OPT-A is back by 2026-11-19.", ["OPT-A"])).toEqual([]);
    // A code cut short at a dash is not the code.
    expect(
      checkExplanation([{ ref: "F9", values: { part: "SWP-1155-6" } }], {
        sentences: [say("F9 uses SWP-1155.", ["F9"])],
      }).problems,
    ).toEqual([
      'sentence 1 mentions "SWP-1155", which is not in the items it names',
    ]);
  });

  it('[TC-010] Given "not", "no", "never" or "isn\'t" before a status word, then it is rejected, unless the whole phrase is the status', () => {
    expect(problems("Amoxicillin (F1) is not short.", ["F1"])).toEqual([
      'sentence 1 says "not short", which negates a status',
    ]);
    expect(problems("Amoxicillin (F1) isn't short.", ["F1"])).toEqual([
      'sentence 1 says "isn\'t short", which negates a status',
    ]);
    expect(problems("Ibuprofen (F2) is never short.", ["F2"])).toEqual([
      'sentence 1 says "never short", which negates a status',
      'sentence 1 says "short", which is not the status of the items it names',
    ]);
    expect(problems("OPT-B is not proposed.", ["OPT-B"])).toEqual([]);
    expect(problems("OPT-B is not  proposed.", ["OPT-B"])).toEqual([]);
    expect(problems("The trip shows No go.", ["indicator"])).toEqual([]);
  });

  it("[TC-010] Given a sentence about more than one item, or one that mentions another item's name or id, then it is rejected", () => {
    expect(
      problems("Amoxicillin (F2) is short by 75; Ibuprofen (F1) is covered.", [
        "F1",
        "F2",
      ]),
    ).toEqual(["sentence 1 names more than one computed item"]);
    expect(
      problems("Amoxicillin (F1) is short, unlike Ibuprofen.", ["F1"]),
    ).toEqual([
      'sentence 1 mentions "Ibuprofen", which belongs to another item',
    ]);
    expect(problems("OPT-A is proposed over OPT-B.", ["OPT-A"])).toEqual([
      'sentence 1 mentions "OPT-B", which belongs to another item',
    ]);
    // Its own name and id, in any letter case, and plain words such as "indicator" are fine; a
    // name shared with the item named is its own; other names are matched exactly as written.
    expect(problems("AMOXICILLIN (f1) affects the indicator.", ["F1"])).toEqual(
      [],
    );
    const lots: Fact[] = [
      { ref: "L1", values: { name: "Vitamin B+C", status: "covered" } },
      { ref: "L2", values: { name: "Vitamin B+C", status: "short" } },
      { ref: "L3", values: { name: "Zinc (oral)", status: "covered" } },
    ];
    expect(
      checkExplanation(lots, {
        sentences: [say("Vitamin B+C (L2) is short; see Zinc (oral).", ["L2"])],
      }).problems,
    ).toEqual([
      'sentence 1 mentions "Zinc (oral)", which belongs to another item',
    ]);
    expect(
      checkExplanation(lots, {
        sentences: [say("Vitamin BBC (L2) is short.", ["L2"])],
      }).problems,
    ).toEqual([]);
    expect(explainPlanStep.buildPrompt({ facts: FACTS })).toMatch(
      /one sentence names exactly one ref/i,
    );
  });

  it("[TC-010] Given a number written in words, then it is rejected: numbers are written in digits", () => {
    expect(
      problems("Amoxicillin (F1) is short by three hundred.", ["F1"]),
    ).toEqual([
      'sentence 1 writes "three" in words: numbers are written in digits',
      'sentence 1 writes "hundred" in words: numbers are written in digits',
    ]);
    expect(problems("OPT-B has a dozen missed flights.", ["OPT-B"])).toEqual([
      'sentence 1 writes "dozen" in words: numbers are written in digits',
    ]);
  });

  it("[TC-010] Given a status the code never computed, or a judgement, then it is rejected", () => {
    expect(problems("Amoxicillin (F1) has expired.", ["F1"])).toEqual([
      'sentence 1 says "expired", which is not the status of the items it names',
    ]);
    expect(problems("Amoxicillin (F1) is ineligible.", ["F1"])).toEqual([
      'sentence 1 says "ineligible", which is not the status of the items it names',
    ]);
    expect(
      problems("OPT-A is the best and safest option; you should take it.", [
        "OPT-A",
      ]),
    ).toEqual([
      'sentence 1 says "best", a judgement that is not in the computed results',
      'sentence 1 says "safest", a judgement that is not in the computed results',
      'sentence 1 says "should", a judgement that is not in the computed results',
    ]);
    expect(problems("We recommend OPT-A.", ["OPT-A"])).toEqual([
      'sentence 1 says "recommend", a judgement that is not in the computed results',
    ]);
    // A missing document's status is "missing".
    const facts = readinessFacts({
      indicator: "No go",
      items: [],
      missingDocuments: [
        { documentId: "DOC-1", name: "Packing list", reason: "not prepared" },
      ],
      problems: [],
    });
    expect(
      checkExplanation(facts, {
        sentences: [say("The packing list (DOC-1) is missing.", ["DOC-1"])],
      }).accepted,
    ).toBe(true);
  });
});

describe("Messages: no relative dates, invented people or promises (REV-011 part 3)", () => {
  it("[TC-310] Given a relative date or a weekday, then the message is not accepted: it uses the dates given", () => {
    expect(messageProblems("The part arrives tomorrow.")).toEqual([
      'the message says "tomorrow": use the dates given',
    ]);
    expect(
      messageProblems("Today we wait; soon, next week or on Monday it comes."),
    ).toEqual([
      'the message says "Today": use the dates given',
      'the message says "soon": use the dates given',
      'the message says "next week": use the dates given',
      'the message says "Monday": use the dates given',
    ]);
    expect(messageStep.buildPrompt(DISRUPTION)).toMatch(
      /write dates exactly as given/i,
    );
  });

  it("[TC-310] Given a title followed by a name, then the message is not accepted: people are referred to by the ids given", () => {
    expect(messageProblems("Pastor Juan will collect the part.")).toEqual([
      'the message names a person ("Pastor Juan"): refer to people only by the ids given',
    ]);
    expect(messageProblems("Dr. Okafor and Capt Smith agree.")).toEqual([
      'the message names a person ("Dr. Okafor"): refer to people only by the ids given',
      'the message names a person ("Capt Smith"): refer to people only by the ids given',
    ]);
    expect(messageProblems("Please tell the pastor at B03.")).toEqual([]);
  });

  it("[TC-310] Given a date written in words, then it is not accepted, because its number is only a piece of a date given", () => {
    expect(messageProblems("We expect it on 20 November.")).toEqual([
      'the message mentions "20", which is not in the disruption',
    ]);
  });

  it("[SYS-309, TC-310] Given a promise about the schedule, then the message is not accepted: dates are expected, not promised", () => {
    expect(
      messageProblems(
        "Confirmed: the part is guaranteed and will definitely come; we promise.",
      ),
    ).toEqual([
      'the message says "Confirmed": dates are expected, not promised',
      'the message says "guaranteed": dates are expected, not promised',
      'the message says "definitely": dates are expected, not promised',
      'the message says "promise": dates are expected, not promised',
    ]);
    const prompt = messageStep.buildPrompt(DISRUPTION);
    expect(prompt).toMatch(/expected or estimated/);
    expect(prompt).toMatch(/never say that flights will resume/i);
  });
});
