// Shared acceptance test for offline storage and sync, from DOC-070. Waits on OD-001 and
// OD-017 (CLAUDE.md rule 1).
import { describe, it } from "vitest";

describe("Offline storage and sync acceptance", () => {
  it.todo(
    "[TC-001] Given edits made offline, when the connection returns, then all edits appear after sync and any conflict keeps both versions in the audit log",
  );
  it.todo(
    "[TC-018] Given the protection for data stored on devices chosen in OD-033, then data at rest is protected as decided",
  );
  it.todo(
    '[TC-023] Given the same lot quantity changed on two devices offline, when both sync, then the lot is marked "Conflict: check", not counted until a person chooses, and both versions are in the audit log',
  );
  it.todo(
    "[TC-024] Given a signed-in device that goes offline, then work continues and edits sync with the editor recorded; another team cannot read the records; signing out with unsynced edits warns and keeps them",
  );
});
