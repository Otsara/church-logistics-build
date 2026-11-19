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
import { ungrounded, wordsIn, type Value } from "./grounding.ts";
import { WORDING_RULES, wordingProblems } from "./wording.ts";

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

/**
 * Status words checked against the facts; phrases first, so "no go" is not read as "go". The
 * apps' own status words are all here, so a status the code never computed is refused (owner,
 * 2026-11-17; REV-011, ADR-040).
 */
const STATUSES = [
  "no go",
  "needs review",
  "data missing",
  "not proposed",
  "not ready",
  "go",
  "covered",
  "short",
  "candidate",
  "excluded",
  "proposed",
  "eligible",
  "ineligible",
  "blocked",
  "discard",
  "expired",
  "ready",
  "missing",
  "unknown",
] as const;

/** Words that negate a status: "not short" says the opposite of "short". */
const NEGATION = new RegExp(
  `(?<![\\p{L}])(?:not|no|never|(?:is|are|was|were)n['’]t)\\s+(?:${STATUSES.join("|")})(?![\\p{L}])`,
  "gu",
);

/** Judgements that belong to code (the ranking) and to the people who decide, never to the AI. */
const JUDGEMENTS = [
  "safest",
  "safe",
  "best",
  "worst",
  "recommend\\p{L}*",
  "should",
  "must",
];

const instructions = (task: string): string => `${task}
Use only the facts below. One sentence names exactly one ref, in "refs": the fact it is about. It may mention only the codes, dates, numbers and statuses in that fact, and never another fact's ref or name. ${WORDING_RULES} Do not add advice, causes, judgements of which is best or safe, or anything not in the facts. Never say that anything is ${FORBIDDEN_IN_WORDS}: people decide.
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

/** The names and plain refs of other facts, which a sentence must not mention; its own are left out. */
function othersOf(facts: readonly Fact[], named: Fact): string[] {
  const own = [named.ref, ...Object.values(named.values)].map((v) =>
    String(v).toLowerCase(),
  );
  return facts
    .flatMap((f) => [
      ...(typeof f.values["name"] === "string" ? [f.values["name"]] : []),
      // A ref with digits is a code, checked as one; a lowercase word ("indicator") is not a name.
      ...(/\d|^\p{Ll}/u.test(f.ref) ? [] : [f.ref]),
    ])
    .filter((token) => !own.includes(token.toLowerCase()));
}

const escape = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Checks an explanation against the facts. Each sentence is about exactly one fact, and may
 * mention only its codes, dates, numbers (in digits) and status, with no negated status, no
 * other item and no judgement (owner, 2026-11-16 and 2026-11-17; ADR-039, ADR-040). Never throws.
 */
export function checkExplanation(
  facts: readonly Fact[],
  output: ExplainOutput,
): ExplanationResult {
  const byRef = new Map(facts.map((f) => [f.ref, f]));
  const problems: string[] = [];
  if (output.sentences.length === 0) problems.push("the explanation is empty");
  for (const [i, sentence] of output.sentences.entries()) {
    const n = String(i + 1);
    const say = (problem: string): void => {
      problems.push(`sentence ${n} ${problem}`);
    };
    for (const word of forbiddenClaims(sentence.text)) {
      say(`says "${word}": nothing here approves anything`);
    }
    const unknown = sentence.refs.filter((r) => !byRef.has(r));
    for (const ref of unknown)
      say(`names ${ref}, which is not in the computed results`);
    if (sentence.refs.length === 0) say("names no computed item");
    if (sentence.refs.length > 1) say("names more than one computed item");
    const [only, ...more] = sentence.refs;
    const fact =
      only !== undefined && more.length === 0 ? byRef.get(only) : undefined;
    if (fact === undefined) continue;
    const text = sentence.text;
    for (const problem of wordingProblems(text)) say(problem);
    const values = [fact.ref, ...Object.values(fact.values)];
    for (const token of ungrounded(text, values)) {
      say(`mentions "${token}", which is not in the items it names`);
    }
    for (const other of othersOf(facts, fact)) {
      if (wordsIn(text, [escape(other)]).length > 0) {
        say(`mentions "${other}", which belongs to another item`);
      }
    }
    // An amount written as "75% covered" or "75 short" is a figure, already checked above,
    // not a status.
    let rest = text
      .toLowerCase()
      .replace(/\s+/gu, " ")
      .replace(/\d ?%? (?:covered|short)(?![\p{L}])/gu, " ");
    for (const [phrase] of rest.matchAll(NEGATION)) {
      if (!(STATUSES as readonly string[]).includes(phrase)) {
        say(`says "${phrase}", which negates a status`);
      }
    }
    const states = values.map((v) => String(v).toLowerCase());
    for (const status of STATUSES) {
      const pattern = new RegExp(`(?<![\\p{L}])${status}(?![\\p{L}])`, "gu");
      if (pattern.test(rest) && !states.includes(status)) {
        say(`says "${status}", which is not the status of the items it names`);
      }
      rest = rest.replace(pattern, " ");
    }
    for (const word of wordsIn(text, JUDGEMENTS)) {
      say(`says "${word}", a judgement that is not in the computed results`);
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
      values: { name: d.name, status: "missing", reason: d.reason },
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
