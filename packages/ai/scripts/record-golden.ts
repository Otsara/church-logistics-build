/**
 * Records the model's answer for each golden example not yet recorded (AIC-101, AIC-301; ADR-035),
 * one call each, with the same model and settings as the gateway (anthropic.ts), and the time it
 * took. Either through the deployed gateway, with a signed-in user's token, or directly with the
 * owner's key on a computer that holds it. The key and token come from the environment and are
 * never written anywhere. Usage:
 *   GATEWAY_URL=... ACCESS_TOKEN=... node packages/ai/scripts/record-golden.ts
 *   ANTHROPIC_API_KEY=... node packages/ai/scripts/record-golden.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { anthropicComplete, MODEL } from "../src/anthropic.ts";
import { gatewayClient } from "../src/gateway-client.ts";
import type { AiStep, AiStepId } from "../src/step.ts";
import { donorListStep } from "../src/steps/donor-list.ts";
import { partsEmailStep } from "../src/steps/parts-email.ts";

const GOLDEN = join(import.meta.dirname, "../golden");
const FILES: readonly [
  string,
  AiStep<{ lines: readonly string[] }, unknown>,
][] = [
  ["aic-101-donor-list.json", donorListStep],
  ["aic-301-parts-email.json", partsEmailStep],
];

type Call = (stepId: AiStepId, prompt: string) => Promise<string>;

function caller(): { call: Call; mode: string } {
  const url = process.env.GATEWAY_URL;
  const token = process.env.ACCESS_TOKEN;
  if (url !== undefined && token !== undefined) {
    return {
      mode: "gateway",
      call: (stepId, prompt) =>
        gatewayClient({
          url,
          stepId,
          accessToken: () => Promise.resolve(token),
          fetch: (u, init) => fetch(u, init),
        }).complete({
          tier: "cheap",
          prompt,
          signal: AbortSignal.timeout(60_000),
        }),
    };
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (key !== undefined) {
    const complete = anthropicComplete(new Anthropic({ apiKey: key }));
    return {
      mode: "direct",
      call: (_stepId, prompt) => complete({ tier: "cheap", prompt }),
    };
  }
  throw new Error("set GATEWAY_URL and ACCESS_TOKEN, or ANTHROPIC_API_KEY");
}

const { call, mode } = caller();
for (const [name, step] of FILES) {
  const path = join(GOLDEN, name);
  const file = JSON.parse(readFileSync(path, "utf8")) as {
    examples: { id: string; lines: string[]; recorded: unknown }[];
  };
  for (const example of file.examples) {
    if (example.recorded !== null) continue;
    const started = performance.now();
    try {
      const text = await call(
        step.id,
        step.buildPrompt({ lines: example.lines }),
      );
      example.recorded = {
        text,
        model: MODEL,
        mode,
        recorded_at: new Date().toISOString(),
        duration_ms: Math.round(performance.now() - started),
      };
      process.stdout.write(`${example.id}: recorded\n`);
    } catch (error) {
      process.stdout.write(`${example.id}: not recorded (${String(error)})\n`);
    }
    writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`);
  }
}
