// SpareWing acceptance tests from docs/BUILD_SPEC.md. Each placeholder becomes a real test, written
// failing first, by the SpareWing rules stream (CLAUDE.md rule 1).
import { describe, it } from "vitest";

describe("SpareWing acceptance", () => {
  it.todo(
    "[S-1] Given a grounded aircraft needing part A, a listed alternate B, and one B at base 2, then B appears as a candidate with source base, transfer mode, ETA and the sign-off flag",
  );
  it.todo(
    "[S-2] Given no stock and no alternate, then the result says no candidates were found, to ask a human, and shows any entered order lead time",
  );
  it.todo(
    "[S-3] Given a pilot whose entered currency lapsed, then the pilot is excluded with the reason shown",
  );
  it.todo(
    '[S-4] Given a pilot with no availability data, then the pilot shows as "unknown", not excluded',
  );
  it.todo(
    "[S-5] Given a community with flights on Tuesday and Friday and a five-day grounding starting Monday (Monday to Friday counts as five days inclusive), then two missed flights are reported",
  );
  it.todo(
    '[S-6] Given a transfer mode with no entered lead time, then the ETA shows "unverified"',
  );
  it.todo("[S-7] Given a part marked not serviceable, then it never appears");
});
