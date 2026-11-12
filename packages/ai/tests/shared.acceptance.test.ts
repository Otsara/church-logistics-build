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
  it.todo(
    '[TC-006] Given a donor line whose expiry cannot be read, then the parsed expiry is null, never a guessed date, and the line is "needs review"',
  );
  it.todo(
    "[TC-007] Given a recorded draft that states an import requirement absent from the trip's rule card, then the statement is flagged and the draft is not accepted; a statement citing the rule card id passes",
  );
  it.todo(
    '[TC-008] Given any draft from AIC-102 or AIC-302, then it shows "Draft, human review required" until a person marks it reviewed, and marking it reviewed records the reviewer and time in the audit log',
  );
  it.todo(
    "[TC-010] Given computed readiness or candidates and a recorded explanation that mentions an item, number or status not in the computed results, then the explanation is rejected and the computed list is shown instead",
  );
  it.todo(
    "[TC-017] Given a record with names and extra fields, then each AI step's request contains only the fields that step needs and no names",
  );
  it.todo(
    "[TC-022] Given the golden example files and the held-back manifest, then no golden example comes from a held-back record",
  );
  it.todo(
    "[TC-310] Given a disruption and a chosen candidate, then the drafted message is marked as a draft, carries pilot ids instead of names to the AI step, and is not sent until a person sends it",
  );
  it.todo(
    "[TC-311] Given the recorded golden parts emails, then the parsed parts match the expected results, each with its source line and confidence, and an invalid output leads to manual entry",
  );
});
