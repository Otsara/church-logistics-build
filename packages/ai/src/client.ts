/**
 * What the screens may use from the AI package (ARC-003, ARC-008; ADR-046): the step runner, name
 * replacement, the gateway client and every AI step with its checks. The server-only parts, the
 * call to the AI service (`anthropic.ts`) and the gateway's handler (`gateway.ts`), are left out,
 * so no key or server code can reach a browser (SEC-001).
 */
export type {
  AiDependencies,
  AiOutcome,
  AiStep,
  AiStepId,
  ModelClient,
  ModelTier,
} from "./step.ts";
export { runAiStep } from "./runner.ts";
export { containsName, replaceNames, type KnownName } from "./names.ts";
export { AI_CALL_TIME_LIMIT_MS } from "./limits.ts";
export { gatewayClient, type GatewayClientOptions } from "./gateway-client.ts";
export * from "./steps/cover-letter.ts";
export * from "./steps/donor-list.ts";
export * from "./steps/drafts.ts";
export * from "./steps/explain.ts";
export * from "./steps/message.ts";
export * from "./steps/parts-email.ts";
export * from "./steps/wording.ts";
