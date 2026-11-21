// The in-memory IndexedDB used by the store's tests (SOUP-022). fake-indexeddb's types lean on
// the browser's IndexedDB types, which this workspace deliberately leaves out, so the stand-in
// is typed here once as the store's own DeviceFactory, plus the one call the tests add.
import { IDBFactory } from "fake-indexeddb";
import type { DeviceFactory } from "../src/device.ts";

export interface TestFactory extends DeviceFactory {
  deleteDatabase(name: string): {
    onsuccess: (() => void) | null;
    onblocked: (() => void) | null;
  };
}

export const newFactory = (): TestFactory =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- typed once here, see above
  new IDBFactory();
