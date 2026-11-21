/**
 * The sync rules of the offline store (ARC-019; SYS-007, SYS-008; owner, 2026-11-21; ADR-052).
 *
 * Every synced thing is a versioned record. A device keeps the last synced copy of each record,
 * an outbox of edits with the version each was based on, the conflicts held for a person, the
 * audit entries and a pull cursor. A record in conflict is left out of what the screens and the
 * rules see ("Conflict: check"; a lot is not counted) until a person chooses a version, and both
 * versions and the choice go in the audit log (OD-017; ADR-012). Pure functions: the caller
 * supplies the person and the time, and nothing here reads the clock or the network.
 */
import { isUtcDateTime, type AuditEntry } from "@church-logistics/core";

export const CONFLICT_LABEL = "Conflict: check";

/** A record as the server holds it, with the version the server gave it. */
export interface SyncedRecord {
  readonly kind: string;
  readonly id: string;
  readonly teamId: string;
  readonly version: number;
  readonly data: unknown;
  readonly updatedBy: string;
  readonly updatedAt: string;
}

/** An edit made on this device and not yet accepted by the server. */
export interface PendingEdit {
  readonly kind: string;
  readonly id: string;
  readonly teamId: string;
  /** The server version the edit was made from; 0 for a record the server has never seen. */
  readonly baseVersion: number;
  readonly data: unknown;
  readonly editedBy: string;
  readonly editedAt: string;
}

/** This device's edit and the server's version, held until a person chooses. */
export interface HeldConflict {
  readonly mine: PendingEdit;
  readonly theirs: SyncedRecord;
}

export interface StoreState {
  readonly teamId: string;
  readonly records: Readonly<Record<string, SyncedRecord>>;
  readonly pending: Readonly<Record<string, PendingEdit>>;
  readonly conflicts: Readonly<Record<string, HeldConflict>>;
  readonly audit: readonly AuditEntry[];
  /** The server's sequence number up to which this device has pulled. */
  readonly cursor: number;
}

export type StoreResult =
  | { readonly ok: true; readonly state: StoreState }
  | { readonly ok: false; readonly reason: string };

/** What the server answers to a pushed edit. */
export type PushResult =
  | { readonly accepted: true; readonly record: SyncedRecord }
  | { readonly accepted: false; readonly current: SyncedRecord };

export interface RecordView {
  readonly kind: string;
  readonly id: string;
  readonly data: unknown;
  readonly updatedBy: string;
  readonly updatedAt: string;
  /** False while an edit waits in the outbox. */
  readonly synced: boolean;
}

export interface ConflictView {
  readonly kind: string;
  readonly id: string;
  readonly label: typeof CONFLICT_LABEL;
  readonly mine: unknown;
  readonly theirs: unknown;
}

export interface StoreView {
  /** Records the screens and rules may use; a record in conflict is never among them. */
  readonly settled: readonly RecordView[];
  readonly conflicts: readonly ConflictView[];
  /** Edits not yet accepted by the server, so signing out can warn and keep them (TC-024). */
  readonly unsynced: number;
}

export const keyOf = (kind: string, id: string): string => `${kind}/${id}`;

const label = (kind: string, id: string): string => `${kind} ${id}`;

export function emptyState(teamId: string): StoreState {
  return {
    teamId,
    records: {},
    pending: {},
    conflicts: {},
    audit: [],
    cursor: 0,
  };
}

/** Why a person and time cannot be recorded, or null when they can. */
function badActor(personId: string, time: string): string | null {
  if (personId.trim() === "")
    return "no person: every change records who made it";
  if (!isUtcDateTime(time)) return `"${time}" is not a UTC date and time`;
  return null;
}

/** Records an edit made on this device; it waits in the outbox until it syncs. */
export function edit(
  state: StoreState,
  change: {
    readonly kind: string;
    readonly id: string;
    readonly data: unknown;
  },
  personId: string,
  time: string,
): StoreResult {
  const refused = badActor(personId, time);
  if (refused !== null) return { ok: false, reason: refused };
  if (change.kind.trim() === "" || change.id.trim() === "") {
    return { ok: false, reason: "a record needs a kind and an id" };
  }
  const key = keyOf(change.kind, change.id);
  if (key in state.conflicts) {
    return {
      ok: false,
      reason: `${label(change.kind, change.id)}: ${CONFLICT_LABEL}: a person chooses a version first`,
    };
  }
  const baseVersion =
    state.pending[key]?.baseVersion ?? state.records[key]?.version ?? 0;
  return {
    ok: true,
    state: {
      ...state,
      pending: {
        ...state.pending,
        [key]: {
          kind: change.kind,
          id: change.id,
          teamId: state.teamId,
          baseVersion,
          data: change.data,
          editedBy: personId,
          editedAt: time,
        },
      },
    },
  };
}

/** The edits waiting to be pushed, oldest first, then by kind and id. */
export function pendingEdits(state: StoreState): PendingEdit[] {
  return Object.values(state.pending).sort(
    (a, b) =>
      a.editedAt.localeCompare(b.editedAt) ||
      keyOf(a.kind, a.id).localeCompare(keyOf(b.kind, b.id)),
  );
}

const without = <T>(
  map: Readonly<Record<string, T>>,
  key: string,
): Record<string, T> =>
  Object.fromEntries(Object.entries(map).filter(([k]) => k !== key));

/** Holds a conflict between this device's edit and the server's version, logging both. */
function holdConflict(
  state: StoreState,
  mine: PendingEdit,
  theirs: SyncedRecord,
  personId: string,
  time: string,
): StoreState {
  const key = keyOf(mine.kind, mine.id);
  return {
    ...state,
    records: { ...state.records, [key]: theirs },
    pending: without(state.pending, key),
    conflicts: { ...state.conflicts, [key]: { mine, theirs } },
    audit: [
      ...state.audit,
      {
        time,
        actor: { kind: "person", personId },
        action: `sync conflict on ${label(mine.kind, mine.id)}: both versions kept`,
        before: {
          version: theirs.version,
          data: theirs.data,
          by: theirs.updatedBy,
          at: theirs.updatedAt,
        },
        after: {
          baseVersion: mine.baseVersion,
          data: mine.data,
          by: mine.editedBy,
          at: mine.editedAt,
        },
      },
    ],
  };
}

/**
 * Applies the server's answer to a pushed edit. If the record was edited again on this device
 * while the push was on its way, the newer edit stays in the outbox, now based on the version the
 * server just gave.
 */
export function pushed(
  state: StoreState,
  sent: PendingEdit,
  result: PushResult,
  personId: string,
  time: string,
): StoreState {
  const key = keyOf(sent.kind, sent.id);
  const waiting = state.pending[key];
  if (!result.accepted) {
    return holdConflict(state, waiting ?? sent, result.current, personId, time);
  }
  const records = { ...state.records, [key]: result.record };
  if (waiting === undefined || waiting === sent) {
    return { ...state, records, pending: without(state.pending, key) };
  }
  return {
    ...state,
    records,
    pending: {
      ...state.pending,
      [key]: { ...waiting, baseVersion: result.record.version },
    },
  };
}

/** Applies records pulled from the server, in the server's order, up to its cursor. */
export function pulled(
  state: StoreState,
  incoming: readonly SyncedRecord[],
  cursor: number,
  personId: string,
  time: string,
): StoreState {
  let next = state;
  for (const record of incoming) {
    const key = keyOf(record.kind, record.id);
    if (record.version <= (next.records[key]?.version ?? 0)) continue;
    const held = next.conflicts[key];
    const waiting = next.pending[key];
    if (held !== undefined) {
      next = {
        ...next,
        records: { ...next.records, [key]: record },
        conflicts: { ...next.conflicts, [key]: { ...held, theirs: record } },
      };
    } else if (waiting !== undefined && waiting.baseVersion < record.version) {
      next = holdConflict(next, waiting, record, personId, time);
    } else {
      next = { ...next, records: { ...next.records, [key]: record } };
    }
  }
  return { ...next, cursor: Math.max(next.cursor, cursor) };
}

/**
 * A person settles a conflict by choosing this device's version or the server's. The choice is
 * logged with both versions and pushed as a new edit based on the server's version.
 */
export function resolve(
  state: StoreState,
  kind: string,
  id: string,
  choice: "mine" | "theirs",
  personId: string,
  time: string,
): StoreResult {
  const refused = badActor(personId, time);
  if (refused !== null) return { ok: false, reason: refused };
  const key = keyOf(kind, id);
  const held = state.conflicts[key];
  if (held === undefined) {
    return { ok: false, reason: `${label(kind, id)} is not in conflict` };
  }
  const data = choice === "mine" ? held.mine.data : held.theirs.data;
  return {
    ok: true,
    state: {
      ...state,
      conflicts: without(state.conflicts, key),
      pending: {
        ...state.pending,
        [key]: {
          kind,
          id,
          teamId: state.teamId,
          baseVersion: held.theirs.version,
          data,
          editedBy: personId,
          editedAt: time,
        },
      },
      audit: [
        ...state.audit,
        {
          time,
          actor: { kind: "person", personId },
          action: `conflict on ${label(kind, id)} settled: ${choice === "mine" ? "this device's" : "the other"} version chosen`,
          before: { mine: held.mine.data, theirs: held.theirs.data },
          after: data,
        },
      ],
    },
  };
}

/** What the screens and the rules see: settled records only, conflicts apart, by kind and id. */
export function view(state: StoreState): StoreView {
  const keys = new Set([
    ...Object.keys(state.records),
    ...Object.keys(state.pending),
  ]);
  const settled: RecordView[] = [];
  for (const key of [...keys].sort()) {
    if (key in state.conflicts) continue;
    const waiting = state.pending[key];
    if (waiting !== undefined) {
      settled.push({
        kind: waiting.kind,
        id: waiting.id,
        data: waiting.data,
        updatedBy: waiting.editedBy,
        updatedAt: waiting.editedAt,
        synced: false,
      });
    } else {
      // Every key comes from the records or the outbox, so with no waiting edit it is a record.
      const record = state.records[key] as SyncedRecord;
      settled.push({
        kind: record.kind,
        id: record.id,
        data: record.data,
        updatedBy: record.updatedBy,
        updatedAt: record.updatedAt,
        synced: true,
      });
    }
  }
  return {
    settled,
    conflicts: Object.keys(state.conflicts)
      .sort()
      .map((key) => {
        const held = state.conflicts[key] as HeldConflict;
        return {
          kind: held.mine.kind,
          id: held.mine.id,
          label: CONFLICT_LABEL,
          mine: held.mine.data,
          theirs: held.theirs.data,
        };
      }),
    unsynced: Object.keys(state.pending).length,
  };
}
