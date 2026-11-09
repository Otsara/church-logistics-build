// Shared acceptance tests for the AI wrapper, from docs/BUILD_SPEC.md (CLAUDE.md rule 1).
import { describe, it } from "vitest";

describe("AI wrapper acceptance", () => {
  it.todo(
    "[X-2] Given an AI call times out, then the app keeps working and shows the manual entry path",
  );
  it.todo(
    "[X-3] Given an AI answer that fails the schema, then nothing is saved and the error is logged",
  );
  it.todo(
    "[X-4] Given pilot names, then they are replaced by ids before any AI call",
  );
});
