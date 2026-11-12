// Prepped acceptance tests from DOC-070. Each placeholder becomes a real test, written
// failing first, by the Prepped rules stream (CLAUDE.md rule 1).
import { describe, it } from "vitest";

describe("Prepped acceptance", () => {
  it.todo(
    '[TC-105] Given a destination card that requires an import permit and no permit marked obtained, then readiness shows "Not ready" and the document draft lists the missing permit',
  );
  it.todo(
    "[TC-106] Given a target of 200 courses and 150 eligible, then item coverage is 75%",
  );
  it.todo(
    "[TC-107] Given two donor lines with the same lot number, generic name, strength, form and expiry from different donors, then they merge into one lot with summed quantity that lists both donors",
  );
  it.todo(
    "[TC-112] Given a floor item with a target of 100 and two eligible lots of the same medicine, strength and form, from different donors, of 60 and 50, then the item is covered and both lots are listed against it",
  );
  it.todo(
    '[TC-113] Given a floor item with a target of 100 and 70 eligible, and every other floor item covered, then the indicator shows "No go" and lists that item as 30 short',
  );
  it.todo(
    '[TC-114] Given every floor item covered, and a destination rule card that requires an import permit not yet prepared, then the indicator shows "No go" and lists the permit',
  );
  it.todo(
    '[TC-115] Given every floor item covered and every required document prepared, when the clinician adds a supplement with no eligible stock, then the indicator still shows "Go"',
  );
  it.todo(
    "[TC-116] Given any Go or No go result, then the indicator shows \"Indicator only: deploying the team is the lead clinician's or team leader's decision\"",
  );
  it.todo(
    '[TC-117] Given a floor item with no target quantity entered, then it is "needs review", counts as not covered, and the indicator shows "No go"',
  );
  it.todo(
    "[TC-119] Given a floor item for a 500 mg capsule with a target of 100, 40 eligible capsules, and an eligible lot of the same medicine as an oral suspension, then the suspension is offered as an exchange and the item stays 60 short until the clinician accepts the exchange",
  );
  it.todo(
    '[TC-121] Given two donor lines with the same lot number and medicine but expiry dates of 2027-06-30 and 2027-09-30, then they are not merged and both are "needs review"',
  );
  it.todo(
    "[TC-122] Given a floor item with a target of 100 and 40 eligible capsules, when the clinician accepts an oral suspension exchange and enters that it covers 60 of the target, then the item is covered; when the clinician enters 30, the item stays 30 short",
  );
  it.todo(
    '[TC-125] Given a floor item that is short and eligible lots of another medicine in the same class, then those lots are listed as "Comparable, not equivalent: clinician review required" with their class and its source, and none is added until the clinician chooses it',
  );
  it.todo(
    "[TC-126] Given an anticipated caseload, then any estimated quantity is labelled as an estimate and the target stays empty until the clinician accepts or changes it",
  );
  it.todo(
    '[TC-127] Given two donor lines with the same lot number and generic name but different expiry dates, then they stay separate lots, both flagged "Same lot number, different details: check"',
  );
  it.todo(
    "[TC-131] Given a floor item with a target of 100 and 40 eligible tablets, when the clinician accepts an oral suspension covering 30 and another tablet strength covering 30, then the item is covered",
  );
  it.todo(
    '[TC-132] Given a catalogue with a controlled medicine, when the lead clinician picks floor items, then it is labelled "Controlled: cannot be packed in this build" with its basis',
  );
});
