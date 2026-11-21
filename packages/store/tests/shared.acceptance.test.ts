// Shared acceptance tests for offline storage and sync, from DOC-070 (SYS-007, SYS-008; ARC-019).
// Records live on the device first and sync through the server when online; a conflicting record
// is held for a person, is not counted, and keeps both versions in the audit log (owner,
// 2026-11-12 and 2026-11-21; ADR-012, ADR-052). The server here is an in-memory stand-in with
// the same version check as the database function. Every record is synthetic.
import { describe, expect, it } from "vitest";
import { newFactory } from "./fake-device.ts";
import { openDeviceStore } from "../src/device.ts";
import { syncOnce, type Transport } from "../src/engine.ts";
import {
  CONFLICT_LABEL,
  edit,
  emptyState,
  resolve,
  view,
  type StoreState,
  type SyncedRecord,
} from "../src/sync.ts";

const TEAM = "TEAM-1";
const T1 = "2026-11-21T10:00:00Z";
const T2 = "2026-11-21T11:00:00Z";
const T3 = "2026-11-21T12:00:00Z";

/** An in-memory server with the database function's version check (ADR-052). */
function server() {
  const rows = new Map<string, { record: SyncedRecord; seq: number }>();
  let seq = 0;
  let online = true;
  const transport: Transport = {
    push: (e) => {
      if (!online) return Promise.reject(new Error("offline"));
      const key = `${e.kind}/${e.id}`;
      const current = rows.get(key);
      if (current !== undefined && current.record.version !== e.baseVersion) {
        return Promise.resolve({ accepted: false, current: current.record });
      }
      seq += 1;
      const record: SyncedRecord = {
        kind: e.kind,
        id: e.id,
        teamId: e.teamId,
        version: e.baseVersion + 1,
        data: e.data,
        updatedBy: e.editedBy,
        updatedAt: e.editedAt,
      };
      rows.set(key, { record, seq });
      return Promise.resolve({ accepted: true, record });
    },
    pull: (since) => {
      if (!online) return Promise.reject(new Error("offline"));
      const records = [...rows.values()]
        .filter((r) => r.seq > since)
        .sort((a, b) => a.seq - b.seq)
        .map((r) => r.record);
      return Promise.resolve({ records, cursor: seq });
    },
  };
  return {
    transport,
    rows,
    goOffline: () => {
      online = false;
    },
    goOnline: () => {
      online = true;
    },
  };
}

const must = (result: ReturnType<typeof edit>): StoreState => {
  if (!result.ok) throw new Error(result.reason);
  return result.state;
};

const lotData = (state: StoreState, id: string): unknown =>
  view(state).settled.find((r) => r.kind === "lot" && r.id === id)?.data;

describe("Offline storage and sync acceptance", () => {
  it("[TC-001] Given edits made offline, when the connection returns, then all edits appear after sync, on this device and the team's other devices", async () => {
    const s = server();
    s.goOffline();
    let a = emptyState(TEAM);
    a = must(
      edit(a, { kind: "lot", id: "L1", data: { quantity: 700 } }, "PER-A", T1),
    );
    a = must(
      edit(
        a,
        { kind: "trip", id: "TR1", data: { arrival: "2026-12-01" } },
        "PER-A",
        T1,
      ),
    );
    // Offline: the edits show on the device straight away and wait in the outbox.
    expect(lotData(a, "L1")).toEqual({ quantity: 700 });
    expect(view(a).unsynced).toBe(2);
    const offline = await syncOnce(a, s.transport, "PER-A", T2);
    expect(offline.error).toBe("offline");
    expect(offline.state).toEqual(a);

    s.goOnline();
    a = (await syncOnce(a, s.transport, "PER-A", T2)).state;
    expect(view(a).unsynced).toBe(0);
    let b = emptyState(TEAM);
    b = (await syncOnce(b, s.transport, "PER-B", T2)).state;
    expect(view(b).settled.map((r) => [r.kind, r.id, r.data])).toEqual([
      ["lot", "L1", { quantity: 700 }],
      ["trip", "TR1", { arrival: "2026-12-01" }],
    ]);
  });

  it('[TC-023] Given the same lot quantity changed on two devices offline, when both sync, then the lot is marked "Conflict: check", not counted until a person chooses, and both versions are in the audit log', async () => {
    const s = server();
    let a = must(
      edit(
        emptyState(TEAM),
        { kind: "lot", id: "L1", data: { quantity: 700 } },
        "PER-A",
        T1,
      ),
    );
    a = (await syncOnce(a, s.transport, "PER-A", T1)).state;
    let b = (await syncOnce(emptyState(TEAM), s.transport, "PER-B", T1)).state;

    // Both devices change the lot while offline.
    a = must(
      edit(a, { kind: "lot", id: "L1", data: { quantity: 400 } }, "PER-A", T2),
    );
    b = must(
      edit(b, { kind: "lot", id: "L1", data: { quantity: 650 } }, "PER-B", T2),
    );
    a = (await syncOnce(a, s.transport, "PER-A", T2)).state;
    b = (await syncOnce(b, s.transport, "PER-B", T2)).state;

    // The second device to sync holds the conflict; the lot is not counted.
    expect(lotData(b, "L1")).toBeUndefined();
    expect(view(b).conflicts).toEqual([
      {
        kind: "lot",
        id: "L1",
        label: CONFLICT_LABEL,
        mine: { quantity: 650 },
        theirs: { quantity: 400 },
      },
    ]);
    expect(CONFLICT_LABEL).toBe("Conflict: check");
    expect(b.audit.at(-1)).toEqual({
      time: T2,
      actor: { kind: "person", personId: "PER-B" },
      action: "sync conflict on lot L1: both versions kept",
      before: { version: 2, data: { quantity: 400 }, by: "PER-A", at: T2 },
      after: { baseVersion: 1, data: { quantity: 650 }, by: "PER-B", at: T2 },
    });
    // It cannot be edited until a person chooses.
    expect(
      edit(b, { kind: "lot", id: "L1", data: { quantity: 1 } }, "PER-B", T3),
    ).toEqual({
      ok: false,
      reason: "lot L1: Conflict: check: a person chooses a version first",
    });

    // A person chooses this device's version; it syncs to the other device.
    b = must(resolve(b, "lot", "L1", "mine", "PER-B", T3));
    expect(lotData(b, "L1")).toEqual({ quantity: 650 });
    expect(b.audit.at(-1)).toEqual({
      time: T3,
      actor: { kind: "person", personId: "PER-B" },
      action: "conflict on lot L1 settled: this device's version chosen",
      before: { mine: { quantity: 650 }, theirs: { quantity: 400 } },
      after: { quantity: 650 },
    });
    b = (await syncOnce(b, s.transport, "PER-B", T3)).state;
    a = (await syncOnce(a, s.transport, "PER-A", T3)).state;
    expect(lotData(a, "L1")).toEqual({ quantity: 650 });
    expect(view(a).conflicts).toEqual([]);
    expect(view(b).unsynced).toBe(0);
  });

  it("[TC-024] Given a signed-in device that goes offline, then work continues and edits sync with the editor recorded, and unsynced edits are counted so signing out can warn and keep them", async () => {
    const s = server();
    s.goOffline();
    let a = must(
      edit(
        emptyState(TEAM),
        { kind: "lot", id: "L1", data: { quantity: 5 } },
        "PER-A",
        T1,
      ),
    );
    const attempt = await syncOnce(a, s.transport, "PER-A", T1);
    expect(attempt.state).toBe(a);
    expect(view(a).unsynced).toBe(1);
    s.goOnline();
    a = (await syncOnce(a, s.transport, "PER-A", T2)).state;
    expect(s.rows.get("lot/L1")?.record).toMatchObject({
      updatedBy: "PER-A",
      updatedAt: T1,
      version: 1,
    });
    expect(view(a).settled[0]).toMatchObject({
      updatedBy: "PER-A",
      synced: true,
    });
  });

  // Tested against the database, not here: supabase/tests/team_separation.sql (run 2026-11-21).
  it.todo(
    "[TC-024] Given two teams, then the database rules let neither read nor write the other's records",
  );

  it.todo(
    "[TC-018] Given the protection for data stored on devices chosen in OD-033, then data at rest is protected as decided",
  );

  it("[TC-032] Given records, waiting edits, conflicts and audit entries saved on a device, when the app reloads, then all are as they were; when the demo is reset, the device store is empty", async () => {
    const factory = newFactory();
    const s = server();
    let a = must(
      edit(
        emptyState(TEAM),
        { kind: "lot", id: "L1", data: { quantity: 700 } },
        "PER-A",
        T1,
      ),
    );
    a = (await syncOnce(a, s.transport, "PER-A", T1)).state;
    let b = (await syncOnce(emptyState(TEAM), s.transport, "PER-B", T1)).state;
    a = must(
      edit(a, { kind: "lot", id: "L1", data: { quantity: 400 } }, "PER-A", T2),
    );
    b = must(
      edit(b, { kind: "lot", id: "L1", data: { quantity: 650 } }, "PER-B", T2),
    );
    b = must(
      edit(
        b,
        { kind: "trip", id: "TR1", data: { arrival: "2026-12-01" } },
        "PER-B",
        T2,
      ),
    );
    await syncOnce(a, s.transport, "PER-A", T2);
    b = (await syncOnce(b, s.transport, "PER-B", T2)).state;
    expect(view(b).conflicts).toHaveLength(1);

    const device = openDeviceStore(factory, "demo");
    expect(await device.load()).toBeNull();
    await device.save(b);
    const reopened = openDeviceStore(factory, "demo");
    expect(await reopened.load()).toEqual(b);

    await reopened.reset();
    expect(await openDeviceStore(factory, "demo").load()).toBeNull();
  });
});
