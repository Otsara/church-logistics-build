// Shared acceptance tests for the AI wrapper, from DOC-070 (CLAUDE.md rule 1).
import { describe, it } from "vitest";

describe("AI wrapper acceptance", () => {
  it.todo(
    "[TC-002] Given an AI call times out, then the app keeps working and shows the manual entry path",
  );
  it.todo(
    "[TC-003] Given an AI answer that fails the schema, then nothing is saved and the error is logged",
  );
  it.todo(
    "[TC-004] Given pilot names, then they are replaced by ids before any AI call",
  );
});
