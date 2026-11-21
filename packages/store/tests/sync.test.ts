// The sync rules in detail (ARC-019; SYS-007; ADR-052): every refusal, every ordering and every
// way a conflict can arise or move. Records are synthetic.
import { describe, expect, it } from "vitest";
import { newFactory } from "./fake-device.ts";
import { openDeviceStore } from "../src/device.ts";
import { syncOnce, type Transport } from "../src/engine.ts";
import {
  edit,
  emptyState,
  pendingEdits,
  pulled,
  pushed,
  resolve,
  view,
  type PendingEdit,
  type StoreState,
  type SyncedRecord,
} from "../src/sync.ts";

const TEAM = "TEAM-1";
const T1 = "2026-11-21T10:00:00Z";
const T2 = "2026-11-21T11:00:00Z";

const must = (result: ReturnType<typeof edit>): StoreState => {
  if (!result.ok) throw new Error(result.reason);
  return result.state;
};

const record = (
  id: string,
  version: number,
  data: unknown,
  by = "PER-B",
): SyncedRecord => ({
  kind: "lot",
  id,
  teamId: TEAM,
  version,
  data,
  updatedBy: by,
  updatedAt: T1,
});

describe("Edits on the device", () => {
  it('[TC-024] Given a change with no person, a time that is not UTC, no kind or id, or a kind containing "/", then it is refused and nothing changes', () => {
    const s = emptyState(TEAM);
    const change = { kind: "lot", id: "L1", data: 1 };
    expect(edit(s, change, " ", T1)).toEqual({
      ok: false,
      reason: "no person: every change records who made it",
    });
    expect(edit(s, change, "PER-A", "2026-11-21 10:00")).toEqual({
      ok: false,
      reason: '"2026-11-21 10:00" is not a UTC date and time',
    });
    expect(edit(s, { ...change, kind: "" }, "PER-A", T1)).toEqual({
      ok: false,
      reason: "a record needs a kind and an id",
    });
    expect(edit(s, { ...change, kind: "  " }, "PER-A", T1)).toEqual({
      ok: false,
      reason: "a record needs a kind and an id",
    });
    expect(edit(s, { ...change, id: " " }, "PER-A", T1)).toEqual({
      ok: false,
      reason: "a record needs a kind and an id",
    });
    // A kind with "/" could make two different records share a key (REV-017).
    expect(edit(s, { ...change, kind: "lot/x" }, "PER-A", T1)).toEqual({
      ok: false,
      reason: 'a record\'s kind cannot contain "/"',
    });
    // An id may contain "/", as lot numbers sometimes do.
    expect(edit(s, { ...change, id: "A/12" }, "PER-A", T1).ok).toBe(true);
  });

  it("[TC-001] Given a record edited twice before it syncs, then one edit waits, based on the version the first was made from", () => {
    let s = pulled(emptyState(TEAM), [record("L1", 3, 10)], 1, "PER-A", T1);
    s = must(edit(s, { kind: "lot", id: "L1", data: 20 }, "PER-A", T1));
    s = must(edit(s, { kind: "lot", id: "L1", data: 30 }, "PER-A", T2));
    expect(pendingEdits(s)).toEqual([
      {
        kind: "lot",
        id: "L1",
        teamId: TEAM,
        baseVersion: 3,
        data: 30,
        editedBy: "PER-A",
        editedAt: T2,
      },
    ]);
  });

  it("[TC-001] Given several waiting edits, then they are pushed oldest first, and edits made at the same time by kind and id", () => {
    let s = emptyState(TEAM);
    s = must(edit(s, { kind: "trip", id: "B", data: 1 }, "PER-A", T2));
    s = must(edit(s, { kind: "trip", id: "A", data: 1 }, "PER-A", T2));
    s = must(edit(s, { kind: "lot", id: "Z", data: 1 }, "PER-A", T1));
    expect(pendingEdits(s).map((e) => `${e.kind}/${e.id}`)).toEqual([
      "lot/Z",
      "trip/A",
      "trip/B",
    ]);
    // The screens see records by kind and id, whatever order they were made in.
    expect(view(s).settled.map((r) => `${r.kind}/${r.id}`)).toEqual([
      "lot/Z",
      "trip/A",
      "trip/B",
    ]);
  });
});

describe("The server's answers", () => {
  const sent = (s: StoreState): PendingEdit =>
    pendingEdits(s)[0] as PendingEdit;

  it("[TC-001] Given the record edited again while its push was on the way, when the push is accepted, then the newer edit still waits, now based on the new version", () => {
    let s = must(
      edit(emptyState(TEAM), { kind: "lot", id: "L1", data: 1 }, "PER-A", T1),
    );
    const first = sent(s);
    s = must(edit(s, { kind: "lot", id: "L1", data: 2 }, "PER-A", T2));
    s = pushed(
      s,
      first,
      { accepted: true, record: record("L1", 1, 1, "PER-A") },
      "PER-A",
      T2,
    );
    expect(s.records["lot/L1"]?.version).toBe(1);
    expect(pendingEdits(s)).toEqual([{ ...sent(s), baseVersion: 1, data: 2 }]);
  });

  it("[TC-023] Given the record edited again while its push was on the way, when the push is refused, then the conflict holds the newest edit", () => {
    let s = must(
      edit(emptyState(TEAM), { kind: "lot", id: "L1", data: 1 }, "PER-A", T1),
    );
    const first = sent(s);
    s = must(edit(s, { kind: "lot", id: "L1", data: 2 }, "PER-A", T2));
    s = pushed(
      s,
      first,
      { accepted: false, current: record("L1", 4, 9) },
      "PER-A",
      T2,
    );
    expect(view(s).conflicts).toEqual([
      { kind: "lot", id: "L1", label: "Conflict: check", mine: 2, theirs: 9 },
    ]);
    expect(view(s).settled).toEqual([]);
    // Other records on the device are untouched.
    const other = pulled(s, [record("L9", 1, 7)], 1, "PER-A", T2);
    const again = pushed(
      must(edit(other, { kind: "lot", id: "L8", data: 1 }, "PER-A", T2)),
      first,
      { accepted: false, current: record("L1", 5, 9) },
      "PER-A",
      T2,
    );
    expect(Object.keys(again.records).sort()).toEqual(["lot/L1", "lot/L9"]);
  });

  it("[TC-023] Given a refused push whose edit no longer waits, then the conflict holds the edit that was sent", () => {
    const first = sent(
      must(
        edit(emptyState(TEAM), { kind: "lot", id: "L1", data: 1 }, "PER-A", T1),
      ),
    );
    const s = pushed(
      emptyState(TEAM),
      first,
      { accepted: false, current: record("L1", 2, 5) },
      "PER-A",
      T2,
    );
    expect(s.conflicts["lot/L1"]?.mine).toBe(first);
  });
});

describe("Pulling from the server", () => {
  it("[TC-001] Given a pulled record no newer than this device's copy, then it is ignored; the cursor never moves back", () => {
    let s = pulled(emptyState(TEAM), [record("L1", 2, "new")], 7, "PER-A", T1);
    s = pulled(
      s,
      [record("L1", 2, "same"), record("L1", 1, "old")],
      3,
      "PER-A",
      T1,
    );
    expect(s.records["lot/L1"]?.data).toBe("new");
    expect(s.cursor).toBe(7);
  });

  it("[TC-023] Given a waiting edit made from an older version than the one pulled, then it becomes a conflict with both versions logged", () => {
    let s = pulled(emptyState(TEAM), [record("L1", 1, 10)], 1, "PER-A", T1);
    s = must(edit(s, { kind: "lot", id: "L1", data: 20 }, "PER-A", T1));
    s = pulled(s, [record("L1", 2, 30)], 2, "PER-A", T2);
    expect(view(s).conflicts).toEqual([
      { kind: "lot", id: "L1", label: "Conflict: check", mine: 20, theirs: 30 },
    ]);
    expect(view(s).unsynced).toBe(0);
    expect(s.audit.at(-1)?.action).toBe(
      "sync conflict on lot L1: both versions kept",
    );
  });

  it("[TC-023] Given a record already in conflict, when a newer version is pulled, then the conflict holds the newer version and is still held", () => {
    let s = pulled(emptyState(TEAM), [record("L1", 1, 10)], 1, "PER-A", T1);
    s = must(edit(s, { kind: "lot", id: "L1", data: 20 }, "PER-A", T1));
    s = pulled(s, [record("L1", 2, 30)], 2, "PER-A", T2);
    s = pulled(s, [record("L1", 3, 40)], 3, "PER-A", T2);
    expect(view(s).conflicts[0]).toMatchObject({ mine: 20, theirs: 40 });
    expect(s.records["lot/L1"]?.version).toBe(3);
    expect(s.audit).toHaveLength(1);
  });

  it("[TC-001] Given a waiting edit made from the version pulled or later, then no conflict arises and the edit still waits", () => {
    const waiting = must(
      edit(emptyState(TEAM), { kind: "lot", id: "L1", data: 20 }, "PER-A", T1),
    );
    const based: StoreState = {
      ...waiting,
      pending: {
        "lot/L1": {
          ...(waiting.pending["lot/L1"] as PendingEdit),
          baseVersion: 2,
        },
      },
    };
    const s = pulled(based, [record("L1", 2, 30)], 2, "PER-A", T2);
    expect(view(s).conflicts).toEqual([]);
    expect(view(s).settled[0]).toMatchObject({ data: 20, synced: false });
  });
});

describe("Settling a conflict", () => {
  const conflicted = (): StoreState => {
    let s = pulled(emptyState(TEAM), [record("L1", 1, 10)], 1, "PER-A", T1);
    s = must(edit(s, { kind: "lot", id: "L1", data: 20 }, "PER-A", T1));
    return pulled(s, [record("L1", 2, 30)], 2, "PER-A", T2);
  };

  it("[TC-023] Given a person chooses the other version, then it is pushed as a new edit from the server's version, and the choice is logged with both versions", () => {
    const result = resolve(conflicted(), "lot", "L1", "theirs", "PER-C", T2);
    if (!result.ok) throw new Error(result.reason);
    expect(pendingEdits(result.state)).toEqual([
      {
        kind: "lot",
        id: "L1",
        teamId: TEAM,
        baseVersion: 2,
        data: 30,
        editedBy: "PER-C",
        editedAt: T2,
      },
    ]);
    expect(result.state.audit.at(-1)).toEqual({
      time: T2,
      actor: { kind: "person", personId: "PER-C" },
      action: "conflict on lot L1 settled: the other version chosen",
      before: { mine: 20, theirs: 30 },
      after: 30,
    });
  });

  it("[TC-023] Given no person, a time that is not UTC, or a record not in conflict, then settling is refused", () => {
    expect(resolve(conflicted(), "lot", "L1", "mine", "", T2)).toEqual({
      ok: false,
      reason: "no person: every change records who made it",
    });
    expect(resolve(conflicted(), "lot", "L1", "mine", "PER-C", "now")).toEqual({
      ok: false,
      reason: '"now" is not a UTC date and time',
    });
    expect(resolve(conflicted(), "lot", "L2", "mine", "PER-C", T2)).toEqual({
      ok: false,
      reason: "lot L2 is not in conflict",
    });
  });

  it("[TC-023] Given several conflicts, then they are listed by kind and id", () => {
    let s = pulled(
      emptyState(TEAM),
      [record("L2", 1, 1), record("L1", 1, 1)],
      1,
      "PER-A",
      T1,
    );
    s = must(edit(s, { kind: "lot", id: "L2", data: 2 }, "PER-A", T1));
    s = must(edit(s, { kind: "lot", id: "L1", data: 2 }, "PER-A", T1));
    s = pulled(s, [record("L2", 2, 3), record("L1", 2, 3)], 2, "PER-A", T2);
    expect(view(s).conflicts.map((c) => c.id)).toEqual(["L1", "L2"]);
  });
});

describe("Sync and device faults", () => {
  it("[TC-024] Given a server that fails with something other than an error, then the sync stops with its text and nothing is lost", async () => {
    const s = must(
      edit(emptyState(TEAM), { kind: "lot", id: "L1", data: 1 }, "PER-A", T1),
    );
    const failing: Transport = {
      // A server that rejects with a plain string, not an Error, is exactly the case under test.
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      push: () => Promise.reject("gateway timeout"),
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      pull: () => Promise.reject("gateway timeout"),
    };
    expect(await syncOnce(s, failing, "PER-A", T2)).toEqual({
      state: s,
      error: "gateway timeout",
    });
  });

  it("[TC-032] Given a device store that cannot be opened, then loading fails with the browser's error rather than returning an empty store", async () => {
    const factory = newFactory();
    const newer = factory.open("church-logistics-demo", 2);
    await new Promise<void>((done) => {
      newer.onsuccess = () => {
        newer.result.close();
        done();
      };
    });
    await expect(openDeviceStore(factory, "demo").load()).rejects.toBeDefined();
  });

  it("[TC-032] Given a saved device store, then it is one record under a fixed name, and every connection is closed after use so the browser can upgrade or delete the database", async () => {
    const factory = newFactory();
    const state = must(
      edit(emptyState(TEAM), { kind: "lot", id: "L1", data: 1 }, "PER-A", T1),
    );
    await openDeviceStore(factory, "demo").save(state);
    const open = factory.open("church-logistics-demo", 1);
    const db = await new Promise<typeof open.result>((done) => {
      open.onsuccess = () => {
        done(open.result);
      };
    });
    const read = db
      .transaction("state", "readonly")
      .objectStore("state")
      .get("current");
    const saved = await new Promise<unknown>((done) => {
      read.onsuccess = () => {
        done(read.result);
      };
    });
    db.close();
    expect(saved).toEqual(state);
    const removed = factory.deleteDatabase("church-logistics-demo");
    const outcome = await new Promise<string>((done) => {
      removed.onblocked = () => {
        done("blocked");
      };
      removed.onsuccess = () => {
        done("deleted");
      };
    });
    expect(outcome).toBe("deleted");
  });
});
