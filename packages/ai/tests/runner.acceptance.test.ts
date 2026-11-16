// The AI step runner: schema-validated, one retry, then manual entry, every call logged
// (ARC-008, ARC-013, SYS-001, SYS-006, SYS-008, SYS-009). Names are synthetic.
import type { AuditEntry } from "@church-logistics/core";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { containsName, replaceNames } from "../src/names.ts";
import { runAiStep } from "../src/runner.ts";
import type { AiDependencies, AiStep, ModelClient } from "../src/step.ts";

const STEP: AiStep<{ readonly text: string }, { readonly count: number }> = {
  id: "AIC-301",
  tier: "cheap",
  outputSchema: z.object({ count: z.number().int() }).strict(),
  buildPrompt: (input) => `Count the parts in: ${input.text}`,
};

const HANG = Symbol("hang");

/** A client that answers from a script: a string, an error to throw, or HANG until aborted. */
function scripted(answers: readonly (string | Error | typeof HANG)[]) {
  const prompts: string[] = [];
  const signals: AbortSignal[] = [];
  const client: ModelClient = {
    complete({ prompt, signal }) {
      prompts.push(prompt);
      signals.push(signal);
      const answer = answers[prompts.length - 1] ?? new Error("no answer");
      if (answer === HANG) {
        return new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            reject(new Error("aborted"));
          });
        });
      }
      return answer instanceof Error
        ? Promise.reject(answer)
        : Promise.resolve(answer);
    },
  };
  return { client, prompts, signals };
}

const pause = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

function deps(
  client: ModelClient,
  names: readonly string[] = [],
): { dependencies: AiDependencies; audit: AuditEntry[] } {
  const audit: AuditEntry[] = [];
  return {
    audit,
    dependencies: {
      client,
      audit: (entry) => audit.push(entry),
      timeoutMs: 20,
      now: () => "2026-11-16T12:00:00Z",
      names,
    },
  };
}

describe("AI step runner", () => {
  it("[ARC-008] Given a valid answer, then it is returned after one call, and the call is logged", async () => {
    const { client, prompts, signals } = scripted(['{"count": 3}']);
    const { dependencies, audit } = deps(client);
    const outcome = await runAiStep(
      STEP,
      { text: "SWP-1000-1 x3" },
      dependencies,
    );
    expect(outcome).toEqual({ kind: "ok", value: { count: 3 }, attempts: 1 });
    // The time limit is cleared once the answer arrives, so the request is never cancelled late.
    await pause(40);
    expect(signals[0]?.aborted).toBe(false);
    expect(prompts).toEqual(["Count the parts in: SWP-1000-1 x3"]);
    expect(audit).toEqual([
      {
        time: "2026-11-16T12:00:00Z",
        actor: { kind: "ai_step", stepId: "AIC-301" },
        action: "AI call AIC-301, attempt 1: valid output",
        before: { tier: "cheap" },
        after: { result: "ok" },
      },
    ]);
  });

  it("[TC-002] Given an AI call times out, then it is tried once more and the person is sent to manual entry; the app keeps working", async () => {
    const { client, prompts, signals } = scripted([HANG, HANG]);
    const { dependencies, audit } = deps(client);
    const outcome = await runAiStep(STEP, { text: "x" }, dependencies);
    expect(outcome).toEqual({
      kind: "manual_entry",
      reason: "timeout",
      attempts: 2,
    });
    expect(prompts).toHaveLength(2);
    // A timed-out request is cancelled.
    expect(signals.map((sig) => sig.aborted)).toEqual([true, true]);
    expect(audit.map((e) => [e.action, e.after])).toEqual([
      ["AI call AIC-301, attempt 1: timed out", { result: "timeout" }],
      [
        "AI call AIC-301, attempt 2: timed out; manual entry shown",
        { result: "timeout" },
      ],
    ]);
    // A timeout on the first try and a valid answer on the retry is accepted.
    const second = deps(scripted([HANG, '{"count": 1}']).client);
    const retried = await runAiStep(STEP, { text: "x" }, second.dependencies);
    expect(retried).toEqual({ kind: "ok", value: { count: 1 }, attempts: 2 });
    expect(second.audit.map((e) => e.action)).toEqual([
      "AI call AIC-301, attempt 1: timed out",
      "AI call AIC-301, attempt 2: valid output",
    ]);
  });

  it("[TC-003] Given an AI answer that fails the schema, then nothing is returned to be saved and the error is logged; a valid retry is accepted", async () => {
    const { client } = scripted(['{"count": "three"}', "not JSON at all"]);
    const { dependencies, audit } = deps(client);
    const outcome = await runAiStep(STEP, { text: "x" }, dependencies);
    expect(outcome).toEqual({
      kind: "manual_entry",
      reason: "invalid_output",
      attempts: 2,
    });
    expect(outcome).not.toHaveProperty("value");
    expect(audit.map((e) => [e.action, e.after])).toEqual([
      [
        "AI call AIC-301, attempt 1: output failed the schema",
        {
          result: "invalid_output",
          issues: [{ path: "count", message: expect.any(String) as string }],
        },
      ],
      [
        "AI call AIC-301, attempt 2: output failed the schema; manual entry shown",
        {
          result: "invalid_output",
          issues: [{ path: "", message: "not JSON" }],
        },
      ],
    ]);
    // The logged issues never carry the model's text.
    expect(JSON.stringify(audit)).not.toContain("three");
    // A nested field is logged by its full path.
    const nested: AiStep<null, { readonly part: { readonly count: number } }> =
      {
        id: "AIC-301",
        tier: "cheap",
        buildPrompt: () => "nested",
        outputSchema: z.object({ part: z.object({ count: z.number() }) }),
      };
    const deep = deps(scripted(['{"part": {"count": "x"}}', "[]"]).client);
    await runAiStep(nested, null, deep.dependencies);
    expect(deep.audit[0]?.after).toMatchObject({
      issues: [{ path: "part.count" }],
    });
    // An extra field fails a strict schema too; a valid retry is accepted.
    const retried = await runAiStep(
      STEP,
      { text: "x" },
      deps(scripted(['{"count": 1, "guess": 2}', '{"count": 2}']).client)
        .dependencies,
    );
    expect(retried).toEqual({ kind: "ok", value: { count: 2 }, attempts: 2 });
  });

  it("[SYS-009] Given the AI service errors twice, then the person is sent to manual entry with the reason logged", async () => {
    const { client } = scripted([new Error("503"), new Error("503")]);
    const { dependencies, audit } = deps(client);
    expect(await runAiStep(STEP, { text: "x" }, dependencies)).toEqual({
      kind: "manual_entry",
      reason: "error",
      attempts: 2,
    });
    expect(audit.map((e) => e.after)).toEqual([
      { result: "error" },
      { result: "error" },
    ]);
  });

  it("[TC-004] Given a prompt that still contains a known name, then no AI call is made, the person is sent to manual entry, and the refusal is logged without the name", async () => {
    const { client, prompts } = scripted(['{"count": 1}']);
    const { dependencies, audit } = deps(client, ["Avery Testpilot"]);
    const outcome = await runAiStep(
      STEP,
      { text: "parts for avery testpilot's aircraft" },
      dependencies,
    );
    expect(outcome).toEqual({
      kind: "manual_entry",
      reason: "names_present",
      attempts: 0,
    });
    expect(prompts).toEqual([]);
    expect(audit).toEqual([
      {
        time: "2026-11-16T12:00:00Z",
        actor: { kind: "ai_step", stepId: "AIC-301" },
        action:
          "AI call AIC-301 refused: a name was found in the prompt; manual entry shown",
        before: { tier: "cheap" },
        after: { result: "names_present" },
      },
    ]);
  });
});

describe("Names replaced by ids before AI calls", () => {
  // Listed shortest first, with stray spaces, to show order and spacing do not matter.
  const PEOPLE = [
    { id: "PIL02", name: "Avery" },
    { id: "PIL01", name: " Avery Testpilot " },
    { id: "D001", name: "Synthetic Donor Clinic" },
  ];

  it("[TC-004] Given pilot and donor names, then each is replaced by its id, whole words only, ignoring letter case, longest name first", () => {
    expect(
      replaceNames(
        "AVERY TESTPILOT flies; Avery checks; Averyville stays; synthetic donor clinic sent it",
        PEOPLE,
      ),
    ).toBe("PIL01 flies; PIL02 checks; Averyville stays; D001 sent it");
    // Characters with special meaning in patterns are matched literally.
    expect(
      replaceNames("Dr. A.B. (Test) signed", [
        { id: "P9", name: "Dr. A.B. (Test)" },
      ]),
    ).toBe("P9 signed");
    // A blank name never matches.
    expect(replaceNames("x - y", [{ id: "P0", name: "  " }])).toBe("x - y");
  });

  it("[TC-004] Given a text and known names, then a name is found whole-word in any letter case, and blank names are ignored", () => {
    expect(containsName("for avery testpilot", [" Avery Testpilot "])).toBe(
      true,
    );
    expect(containsName("for Averyville", ["Avery"])).toBe(false);
    expect(containsName("x - y", ["", "  "])).toBe(false);
  });
});
