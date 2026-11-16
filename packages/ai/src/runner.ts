/**
 * The AI step runner (ARC-008; safety-critical). Builds the prompt, refuses it if a known name is
 * still in it (ARC-013, SYS-006), calls the model with a time limit, parses the answer as JSON and
 * validates it against the step's schema (SYS-001). On a timeout, an error or invalid output it
 * tries once more, then sends the person to manual entry (SYS-009). Every call and refusal is
 * logged without the model's text (SYS-008). It never throws and never reads the clock.
 */
import type { AuditEntry } from "@church-logistics/core";
import { containsName } from "./names.ts";
import type { AiDependencies, AiOutcome, AiStep } from "./step.ts";

type Attempt<Output> =
  | { readonly result: "ok"; readonly value: Output }
  | {
      readonly result: "timeout" | "error";
    }
  | {
      readonly result: "invalid_output";
      readonly issues: readonly { path: string; message: string }[];
    };

const TIMED_OUT = Symbol("timed out");

const DESCRIBE = {
  ok: "valid output",
  timeout: "timed out",
  error: "the AI service failed",
  invalid_output: "output failed the schema",
} as const;

async function attempt<Input, Output>(
  step: AiStep<Input, Output>,
  prompt: string,
  dependencies: AiDependencies,
): Promise<Attempt<Output>> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => {
      // Settle the time limit first, so the race reports a timeout, then stop the request.
      resolve(TIMED_OUT);
      controller.abort();
    }, dependencies.timeoutMs);
  });
  let text: string;
  try {
    const answer = await Promise.race([
      dependencies.client.complete({
        tier: step.tier,
        prompt,
        signal: controller.signal,
      }),
      limit,
    ]);
    if (answer === TIMED_OUT) return { result: "timeout" };
    text = answer;
  } catch {
    return { result: "error" };
  } finally {
    clearTimeout(timer);
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return {
      result: "invalid_output",
      issues: [{ path: "", message: "not JSON" }],
    };
  }
  const parsed = step.outputSchema.safeParse(json);
  return parsed.success
    ? { result: "ok", value: parsed.data }
    : {
        result: "invalid_output",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.map(String).join("."),
          message: issue.message,
        })),
      };
}

/** Runs one AI step: validate, retry once, then manual entry. A failed step never blocks work. */
export async function runAiStep<Input, Output>(
  step: AiStep<Input, Output>,
  input: Input,
  dependencies: AiDependencies,
): Promise<AiOutcome<Output>> {
  const entry = (action: string, after: unknown): AuditEntry => ({
    time: dependencies.now(),
    actor: { kind: "ai_step", stepId: step.id },
    action,
    before: { tier: step.tier },
    after,
  });
  const prompt = step.buildPrompt(input);
  if (containsName(prompt, dependencies.names)) {
    dependencies.audit(
      entry(
        `AI call ${step.id} refused: a name was found in the prompt; manual entry shown`,
        { result: "names_present" },
      ),
    );
    return { kind: "manual_entry", reason: "names_present", attempts: 0 };
  }
  const log = (n: 1 | 2, outcome: Attempt<Output>): void => {
    const last = n === 2 && outcome.result !== "ok";
    dependencies.audit(
      entry(
        `AI call ${step.id}, attempt ${String(n)}: ${DESCRIBE[outcome.result]}${last ? "; manual entry shown" : ""}`,
        outcome.result === "ok" ? { result: "ok" } : outcome,
      ),
    );
  };
  const first = await attempt(step, prompt, dependencies);
  log(1, first);
  if (first.result === "ok") {
    return { kind: "ok", value: first.value, attempts: 1 };
  }
  const second = await attempt(step, prompt, dependencies);
  log(2, second);
  return second.result === "ok"
    ? { kind: "ok", value: second.value, attempts: 2 }
    : { kind: "manual_entry", reason: second.result, attempts: 2 };
}
