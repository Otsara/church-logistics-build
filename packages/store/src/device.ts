/**
 * Keeps the store's state on the device in IndexedDB, so records, waiting edits, conflicts and
 * the audit log survive a reload and work with no connection (ARC-019; TC-032). The caller passes
 * the browser's `indexedDB`, so this file runs the same in a browser and in tests.
 */
import type { StoreState } from "./sync.ts";

// The few IndexedDB calls this file makes, described here so the rest of the code keeps no
// browser types (core must never reach for a browser feature). The browser's `indexedDB` fits.
interface Request<T> {
  readonly result: T;
  readonly error: unknown;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
}
interface ObjectStore {
  get(key: string): Request<unknown>;
  put(value: unknown, key: string): Request<unknown>;
  delete(key: string): Request<unknown>;
}
interface Database {
  createObjectStore(name: string): unknown;
  transaction(
    store: string,
    mode: "readonly" | "readwrite",
  ): { objectStore(name: string): ObjectStore };
  close(): void;
}
interface OpenRequest extends Request<Database> {
  onupgradeneeded: (() => void) | null;
}
/** The browser's `indexedDB`, or a stand-in with the same calls. */
export interface DeviceFactory {
  open(name: string, version: number): OpenRequest;
}

const STORE = "state";
const KEY = "current";

export interface DeviceStore {
  load(): Promise<StoreState | null>;
  save(state: StoreState): Promise<void>;
  /** Empties the device store, as "Reset demo data" does. */
  reset(): Promise<void>;
}

const done = <T>(request: Request<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(new Error(String(request.error)));
    };
  });

/** Opens (and creates on first use) the device store named `name`. */
export function openDeviceStore(
  factory: DeviceFactory,
  name: string,
): DeviceStore {
  const open = (): Promise<Database> => {
    const request = factory.open(`church-logistics-${name}`, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
    return done(request);
  };
  const run = async <T>(
    mode: "readonly" | "readwrite",
    act: (store: ObjectStore) => Request<T>,
  ): Promise<T> => {
    const db = await open();
    try {
      return await done(act(db.transaction(STORE, mode).objectStore(STORE)));
    } finally {
      db.close();
    }
  };
  return {
    load: async () =>
      ((await run("readonly", (s) => s.get(KEY))) as StoreState | undefined) ??
      null,
    save: async (state) => {
      await run("readwrite", (s) => s.put(state, KEY));
    },
    reset: async () => {
      await run("readwrite", (s) => s.delete(KEY));
    },
  };
}
