// Shared acceptance tests for the AI wrapper, from DOC-070 (CLAUDE.md rule 1). The Prepped and
// shared cases are implemented beside the code they test: runner (TC-002 to TC-004), readers
// (TC-006, TC-017), cover letter (TC-007, TC-017), drafts (TC-008, TC-010, TC-017) and golden
// examples (TC-022). The SpareWing cases below wait on the owner's decision on the release gate.
import { describe, it } from "vitest";

describe("AI wrapper acceptance", () => {
  it.todo(
    "[TC-310] Given a disruption and a chosen candidate, then the drafted message is marked as a draft, carries pilot ids instead of names to the AI step, and is not sent until a person sends it",
  );
  it.todo(
    "[TC-311] Given the recorded golden parts emails, then the parsed parts match the expected results, each with its source line and confidence, and an invalid output leads to manual entry",
  );
});
