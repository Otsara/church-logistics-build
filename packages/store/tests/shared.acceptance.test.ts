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
});
