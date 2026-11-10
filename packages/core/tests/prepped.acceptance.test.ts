// Prepped acceptance tests from DOC-070. Each placeholder becomes a real test, written
// failing first, by the Prepped rules stream (CLAUDE.md rule 1).
import { describe, it } from "vitest";

describe("Prepped acceptance", () => {
  it.todo(
    '[TC-101] Given a lot expiring 2027-03-01 and a trip arriving 2026-12-01, when eligibility runs with the 12-month rule, then the lot is blocked with the reason "90 days remaining, 12 months required"',
  );
  it.todo(
    "[TC-102] Given a lot expiring 2028-01-15 and the same trip, then it is eligible with 410 days remaining",
  );
  it.todo(
    "[TC-103] Given a lot marked controlled, then it is blocked whatever its expiry",
  );
  it.todo(
    '[TC-104] Given a lot with no expiry date, then it is "needs review" and excluded from readiness',
  );
  it.todo(
    '[TC-105] Given a destination card that requires an import permit and no permit marked obtained, then readiness shows "Not ready" and the document draft lists the missing permit',
  );
  it.todo(
    "[TC-106] Given a target of 200 courses and 150 eligible, then item coverage is 75%",
  );
  it.todo(
    "[TC-107] Given two donor lines with the same lot number and generic name, then they merge into one lot with summed quantity",
  );
  it.todo(
    "[TC-108] Given the arrival date moves 30 days later, then eligibility recalculates without calling any AI step",
  );
  it.todo(
    '[TC-109] Given a lot marked cold chain that would otherwise be eligible (expiring 2028-01-15, trip arriving 2026-12-01), then it is blocked with the reason "cold-chain items are not handled in this build"',
  );
  it.todo(
    '[TC-110] Given a lot for injection (route: intravenous), needing no cold chain, expiring 2028-01-15, and a trip arriving 2026-12-01, then it is blocked with the reason "outside this build\'s scope"',
  );
  it.todo(
    "[TC-111] Given a skin cream lot and an eye-drop lot, neither needing a cold chain, both expiring 2028-01-15, and a trip arriving 2026-12-01, then both are eligible",
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
});
