/**
 * AIC-103 and AIC-303: explaining computed results in plain language (ARC-008; SYS-003, TC-010).
 * Code turns the results into facts, each with a ref. The AI answers in sentences, each naming
 * the refs it is about; every code, date, number and status word in a sentence must be in those
 * facts, and nothing may claim an approval. Otherwise the explanation is rejected and the
 * computed list is shown instead (owner, 2026-11-16; ADR-039).
 */
import { z } from "zod";
import type { AiStep } from "../step.ts";
import { FORBIDDEN_IN_WORDS, forbiddenClaims } from "./drafts.ts";
import { ungrounded, type Value } from "./grounding.ts";

export interface Fact {
  readonly ref: string;
  readonly values: Readonly<Record<string, Value>>;
}

export interface ExplainInput {
  readonly facts: readonly Fact[];
}

const outputSchema = z.strictObject({
  sentences: z.array(
    z.strictObject({ text: z.string().min(1), refs: z.array(z.string()) }),
  ),
});

export type ExplainOutput = z.infer<typeof outputSchema>;

/** Status words checked against the facts; longer phrases first, so "no go" is not read as "go". */
const STATUSES = [
  "no go",
  "needs review",
  "data missing",
  "not proposed",
  "go",
  "covered",
  "short",
  "candidate",
  "excluded",
  "proposed",
  "eligible",
  "blocked",
  "discard",
] as const;

const instructions = (task: string): string => `${task}
Use only the facts below. Every sentence names, in "refs", the ref of each fact it is about, and may mention only the codes, dates, numbers and statuses in those facts. Do not add advice, causes or anything not in the facts. Never say that anything is ${FORBIDDEN_IN_WORDS}: people decide.
Answer with JSON only, with no other text and no code fences, in this form:
{"sentences":[{"text":"<one plain sentence>","refs":["<ref>"]}]}`;

export const explainReadinessStep: AiStep<ExplainInput, ExplainOutput> = {
  id: "AIC-103",
  tier: "strong",
  outputSchema,
  buildPrompt: ({ facts }) =>
    `${instructions("Explain, in plain language for a mission medical team, only the gaps in these computed readiness results: items that are short or need review, missing documents and problems.")}\n\nFacts:\n${JSON.stringify(facts)}`,
};

export const explainPlanStep: AiStep<ExplainInput, ExplainOutput> = {
  id: "AIC-303",
  tier: "strong",
  outputSchema,
  buildPrompt: ({ facts }) =>
    `${instructions("Explain, in plain language for a flight base director, mechanic and pilot, these computed disruption plan options and why they are ranked in this order.")}\n\nFacts:\n${JSON.stringify(facts)}`,
};

export interface ExplanationResult {
  readonly accepted: boolean;
  readonly problems: readonly string[];
  /** The explanation to show; null when rejected, and the computed list is shown instead. */
  readonly text: string | null;
}

/** Checks an explanation against the facts. Never throws. */
export function checkExplanation(
  facts: readonly Fact[],
  output: ExplainOutput,
): ExplanationResult {
  const known = new Set(facts.map((f) => f.ref));
  const problems: string[] = [];
  if (output.sentences.length === 0) problems.push("the explanation is empty");
  for (const [i, sentence] of output.sentences.entries()) {
    const n = String(i + 1);
    for (const word of forbiddenClaims(sentence.text)) {
      problems.push(
        `sentence ${n} says "${word}": nothing here approves anything`,
      );
    }
    const unknown = sentence.refs.filter((r) => !known.has(r));
    for (const ref of unknown) {
      problems.push(
        `sentence ${n} names ${ref}, which is not in the computed results`,
      );
    }
    if (sentence.refs.length === 0)
      problems.push(`sentence ${n} names no computed item`);
    if (unknown.length > 0) continue;
    const named = facts
      .filter((f) => sentence.refs.includes(f.ref))
      .flatMap((f) => [f.ref, ...Object.values(f.values)]);
    for (const token of ungrounded(sentence.text, named)) {
      problems.push(
        `sentence ${n} mentions "${token}", which is not in the items it names`,
      );
    }
    const states = named.map((v) => String(v).toLowerCase());
    // An amount written as "75% covered" or "75 short" is a figure, already checked above,
    // not a status.
    let rest = sentence.text
      .toLowerCase()
      .replace(/\d\s*%?\s+(?:covered|short)(?![\p{L}])/gu, " ");
    for (const status of STATUSES) {
      const pattern = new RegExp(`(?<![\\p{L}])${status}(?![\\p{L}])`, "gu");
      if (pattern.test(rest) && !states.includes(status)) {
        problems.push(
          `sentence ${n} says "${status}", which is not the status of the items it names`,
        );
      }
      rest = rest.replace(pattern, " ");
    }
  }
  return problems.length > 0
    ? { accepted: false, problems, text: null }
    : {
        accepted: true,
        problems,
        text: output.sentences.map((s) => s.text).join(" "),
      };
}

/** The readiness results as facts (AIC-103). */
export function readinessFacts(assessment: {
  readonly indicator: string;
  readonly items: readonly {
    readonly floorItemId: string;
    readonly genericName: string;
    readonly status: string;
    readonly target: number | null;
    readonly covered: number;
    readonly short: number | null;
    readonly coverage: number;
  }[];
  readonly missingDocuments: readonly {
    readonly documentId: string;
    readonly name: string;
    readonly reason: string;
  }[];
  readonly problems: readonly string[];
}): Fact[] {
  return [
    { ref: "indicator", values: { indicator: assessment.indicator } },
    ...assessment.items.map((item) => ({
      ref: item.floorItemId,
      values: {
        name: item.genericName,
        status: item.status.replace("_", " "),
        target: item.target,
        covered: item.covered,
        short: item.short,
        coverage: Math.round(item.coverage * 100),
      },
    })),
    ...assessment.missingDocuments.map((d) => ({
      ref: d.documentId,
      values: { name: d.name, reason: d.reason },
    })),
    ...assessment.problems.map((problem, i) => ({
      ref: `problem-${String(i + 1)}`,
      values: { problem },
    })),
  ];
}

/** The ranked plan options as facts (AIC-303). */
export function planFacts(
  ranked: readonly {
    readonly rank: number;
    readonly proposed: boolean;
    readonly option: {
      readonly id: string;
      readonly missedFlights: number | null;
      readonly returnToService: string | null;
      readonly transfers: number;
      readonly cost: string | null;
    };
  }[],
): Fact[] {
  return ranked.map(({ rank, proposed, option }) => ({
    ref: option.id,
    values: {
      rank,
      status: proposed ? "proposed" : "not proposed",
      missedFlights: option.missedFlights ?? "unknown",
      returnToService: option.returnToService ?? "unknown",
      transfers: option.transfers,
      cost: option.cost,
    },
  }));
}
