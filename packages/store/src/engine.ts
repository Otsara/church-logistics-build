/**
 * Runs one sync: pushes every waiting edit, then pulls what changed on the server (ARC-019;
 * ADR-052). The server is reached only through a `Transport`, so this file holds no network code
 * and the screens supply the client. Results are applied to the latest state, so an edit made on
 * the device while a sync is on its way is kept.
 */
import {
  pendingEdits,
  pulled,
  pushed,
  type PendingEdit,
  type PushResult,
  type StoreState,
  type SyncedRecord,
} from "./sync.ts";

export interface Transport {
  push(edit: PendingEdit): Promise<PushResult>;
  pull(since: number): Promise<{
    readonly records: readonly SyncedRecord[];
    readonly cursor: number;
  }>;
}

/** Where the store's current state is kept, so a sync can apply its results to the latest. */
export interface StateHolder {
  get(): StoreState;
  set(state: StoreState): void;
}

export interface SyncOutcome {
  readonly state: StoreState;
  /** Why the sync stopped early, or null; what synced before it stopped is kept. */
  readonly error: string | null;
}

const reason = (thrown: unknown): string =>
  thrown instanceof Error ? thrown.message : String(thrown);

/** One sync against the holder's state; stops at the first failure and keeps what synced. */
export async function syncHolder(
  holder: StateHolder,
  transport: Transport,
  personId: string,
  time: string,
): Promise<string | null> {
  try {
    for (const edit of pendingEdits(holder.get())) {
      const result = await transport.push(edit);
      holder.set(pushed(holder.get(), edit, result, personId, time));
    }
    const { records, cursor } = await transport.pull(holder.get().cursor);
    holder.set(pulled(holder.get(), records, cursor, personId, time));
    return null;
  } catch (thrown) {
    return reason(thrown);
  }
}

/** One sync of a given state, for callers that hold the state themselves. */
export async function syncOnce(
  state: StoreState,
  transport: Transport,
  personId: string,
  time: string,
): Promise<SyncOutcome> {
  let current = state;
  const error = await syncHolder(
    {
      get: () => current,
      set: (next) => {
        current = next;
      },
    },
    transport,
    personId,
    time,
  );
  return { state: current, error };
}
