// Prepped acceptance tests from DOC-070. Each placeholder becomes a real test, written
// failing first, by the Prepped rules stream (CLAUDE.md rule 1).
import { describe, it } from "vitest";

describe("Prepped acceptance", () => {
  it.todo(
    '[TC-101] Given a lot expiring 2027-03-01 and a trip arriving 2026-12-01, when eligibility runs with the 365-day rule, then the lot is blocked with the reason "90 days remaining, 365 required"',
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
    "[TC-107] Given two donor lines with the same lot number, generic name, strength, form and expiry from different donors, then they merge into one lot with summed quantity that lists both donors",
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
  it.todo(
    "[TC-118] Given inhaled, nasal, vaginal, ear and eye lots, none needing a cold chain, all expiring 2028-01-15, and a trip arriving 2026-12-01, then all are eligible",
  );
  it.todo(
    "[TC-119] Given a floor item for a 500 mg capsule with a target of 100, 40 eligible capsules, and an eligible lot of the same medicine as an oral suspension, then the suspension is offered as an exchange and the item stays 60 short until the clinician accepts the exchange",
  );
  it.todo(
    '[TC-120] Given a lot expiring 2026-11-01 and a check made on 2026-11-11, then the lot is listed as "Discard: expired" and is never eligible',
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
    '[TC-128] Given a trip arriving 2026-12-01, then a lot expiring 2027-12-01 is eligible and a lot expiring 2027-11-30 is blocked with the reason "364 days remaining, 365 required"',
  );
  it.todo(
    "[TC-129] Given a lot whose expiry is entered as 03/2028, then its expiry is read as 2028-03-31 and shown as read from a month-only date",
  );
});
