// What the screens may use from the AI package (ARC-003, SEC-001; ADR-046, TC-031): the runner,
// the gateway client and every step with its checks, but never the server-only code.
import { describe, expect, it } from "vitest";
import * as client from "../src/client.ts";

describe("The AI package's browser entry point", () => {
  it("[TC-031] Given the entry point the screens import, then it offers the runner, the gateway client and each step with its checks, and no server-only function", () => {
    for (const name of [
      "runAiStep",
      "replaceNames",
      "containsName",
      "gatewayClient",
      "AI_CALL_TIME_LIMIT_MS",
      "donorListStep",
      "checkDonorList",
      "partsEmailStep",
      "checkPartsEmail",
      "explainReadinessStep",
      "explainPlanStep",
      "checkExplanation",
      "messageStep",
      "checkMessage",
      "coverLetterStep",
      "checkCoverLetter",
      "DRAFT_LABEL",
      "markReviewed",
      "editDraft",
      "WORDING_RULES",
    ]) {
      expect(client, name).toHaveProperty(name);
    }
    for (const name of [
      "anthropicComplete",
      "handleGatewayRequest",
      "MODEL",
      "MAX_OUTPUT_TOKENS",
    ]) {
      expect(client, name).not.toHaveProperty(name);
    }
  });
});
