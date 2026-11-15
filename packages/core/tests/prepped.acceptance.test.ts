// Prepped acceptance tests from DOC-070. Each placeholder becomes a real test, written
// failing first, by the Prepped rules stream (CLAUDE.md rule 1).
import { describe, it } from "vitest";

describe("Prepped acceptance", () => {
  it.todo(
    '[TC-105] Given a destination card that requires an import permit and no permit marked obtained, then the indicator shows "No go" and lists the missing permit, the meter shows its percentage as usual, and the document draft lists the missing permit',
  );
  it.todo(
    '[TC-125] Given a floor item that is short and eligible lots of another medicine in the same class, then those lots are listed as "Comparable, not equivalent: clinician review required" with their class and its source, and none is added until the clinician chooses it',
  );
  it.todo(
    "[TC-126] Given an anticipated caseload, then any estimated quantity is labelled as an estimate and the target stays empty until the clinician accepts or changes it",
  );
  it.todo(
    '[TC-132] Given a catalogue with a controlled medicine, when the lead clinician picks floor items, then it is labelled "Controlled: cannot be packed in this build" with its basis',
  );
});
