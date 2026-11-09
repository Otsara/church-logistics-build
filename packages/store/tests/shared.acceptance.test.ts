// Shared acceptance test for offline storage and sync, from docs/BUILD_SPEC.md. Waits on Q-1 and
// Q-17 (CLAUDE.md rule 1).
import { describe, it } from "vitest";

describe("Offline storage and sync acceptance", () => {
  it.todo(
    "[X-1] Given edits made offline, when the connection returns, then all edits appear after sync and any conflict keeps both versions in the audit log",
  );
});
