// The wording rules apply to explanations and messages alike (owner, 2026-11-17; ADR-041):
// numbers in digits, no relative dates or weekdays, no named people, no promises.
import { describe, expect, it } from "vitest";
import {
  checkExplanation,
  explainReadinessStep,
  type Fact,
} from "../src/steps/explain.ts";
import { checkMessage, messageStep } from "../src/steps/message.ts";

const FACTS: readonly Fact[] = [
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
];

const explanationProblems = (text: string) =>
  checkExplanation(FACTS, { sentences: [{ text, refs: ["OPT-A"] }] }).problems;

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

describe("Wording rules for explanations and messages alike (ADR-041)", () => {
  it("[TC-010] Given an explanation with a relative date, a named person or a promise, then it is rejected", () => {
    expect(
      explanationProblems(
        "OPT-A is proposed: Pastor Juan confirmed it is back tomorrow, guaranteed.",
      ),
    ).toEqual([
      'sentence 1 says "tomorrow": use the dates given',
      'sentence 1 names a person ("Pastor Juan"): refer to people only by the ids given',
      'sentence 1 says "confirmed": dates are expected, not promised',
      'sentence 1 says "guaranteed": dates are expected, not promised',
    ]);
    expect(explanationProblems("OPT-A is proposed for Monday.")).toEqual([
      'sentence 1 says "Monday": use the dates given',
    ]);
    const prompt = explainReadinessStep.buildPrompt({ facts: FACTS });
    expect(prompt).toMatch(/write dates exactly as given/i);
    expect(prompt).toMatch(/refer to people only by the ids given/i);
    expect(prompt).toMatch(/expected or estimated/i);
  });

  it("[TC-310] Given a message with a number written in words, then it is not accepted: numbers are written in digits", () => {
    expect(
      checkMessage(DISRUPTION, {
        message: "Base B03: please send two parts for SW-A01.",
      }).problems,
    ).toEqual([
      'the message writes "two" in words: numbers are written in digits',
    ]);
    expect(messageStep.buildPrompt(DISRUPTION)).toMatch(
      /write numbers in digits/i,
    );
  });
});
