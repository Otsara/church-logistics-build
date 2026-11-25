// The sign-out rule's wording for several waiting edits and conflicts (TC-018; owner, 2026-11-23,
// D3). Records are synthetic.
import { describe, expect, it } from "vitest";
import { signOutPlan } from "../src/sign-out.ts";
import {
  emptyState,
  type HeldConflict,
  type PendingEdit,
} from "../src/sync.ts";

const pending = (id: string): PendingEdit => ({
  kind: "lot",
  id,
  teamId: "TEAM-1",
  baseVersion: 1,
  data: {},
  editedBy: "PER-A",
  editedAt: "2026-11-23T10:00:00Z",
});

const held = (id: string): HeldConflict => ({
  mine: pending(id),
  theirs: {
    kind: "lot",
    id,
    teamId: "TEAM-1",
    version: 2,
    data: {},
    updatedBy: "PER-B",
    updatedAt: "2026-11-23T10:00:00Z",
  },
});

describe("Sign-out wording", () => {
  it("[TC-018] Given two conflicts and nothing else waiting, then the warning counts both records", () => {
    expect(
      signOutPlan({
        ...emptyState("TEAM-1"),
        conflicts: { "lot/L1": held("L1"), "lot/L2": held("L2") },
      }),
    ).toMatchObject({
      action: "warn",
      unsynced: 0,
      conflicts: 2,
      message:
        'This device holds 2 records marked "Conflict: check". Stay signed in and choose a version, or sign out and discard this device\'s version.',
    });
  });

  it("[TC-018] Given two waiting edits and two conflicts, then the warning counts both", () => {
    expect(
      signOutPlan({
        ...emptyState("TEAM-1"),
        pending: { "lot/L3": pending("L3"), "lot/L4": pending("L4") },
        conflicts: { "lot/L1": held("L1"), "lot/L2": held("L2") },
      }),
    ).toMatchObject({
      message:
        '2 changes on this device have not synced yet, and 2 records are marked "Conflict: check". Stay signed in until they sync, or sign out and discard them from this device.',
    });
  });
});
