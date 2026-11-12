// SpareWing acceptance tests from DOC-070. Each placeholder becomes a real test, written
// failing first, by the SpareWing rules stream (CLAUDE.md rule 1).
import { describe, it } from "vitest";

describe("SpareWing acceptance", () => {
  it.todo(
    "[TC-301] Given a grounded aircraft needing part A, a listed alternate B, and one B at base 2, then B appears as a candidate with source base, transfer mode, ETA and the sign-off flag",
  );
  it.todo(
    "[TC-302] Given no stock and no alternate, then the result says no candidates were found, to ask a human, and shows any entered order lead time",
  );
  it.todo(
    "[TC-303] Given a pilot whose entered currency lapsed, then the pilot is excluded with the reason shown",
  );
  it.todo(
    '[TC-304] Given a pilot with no availability data, then the pilot shows as "unknown", not excluded',
  );
  it.todo(
    "[TC-305] Given a community with flights on Tuesday and Friday and a five-day grounding starting Monday (Monday to Friday counts as five days inclusive), then two missed flights are reported",
  );
  it.todo(
    '[TC-306] Given a transfer mode with no entered lead time, then the ETA shows "unverified"',
  );
  it.todo(
    "[TC-307] Given a part marked not serviceable, then it never appears",
  );
  it.todo(
    "[TC-308] Given five candidates, then the ranked proposal lists all five with the reasons for their order, and none is removed",
  );
  it.todo(
    "[TC-309] Given any proposal, then nothing approves a schedule change or states that an aircraft is flightworthy, and a decision is recorded only when the flight base director, mechanic or pilot records it",
  );
});
