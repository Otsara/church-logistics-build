/**
 * What signing out does with the data kept on the device (SEC-006; TC-018, TC-024; owner,
 * 2026-11-23, D3; OD-033). The device's own protection (screen lock, disk encryption) guards the
 * data while a person is signed in, and the app clears its store when they sign out. It never
 * clears work that has not reached the server without the person choosing to: with edits waiting
 * or a conflict held, it warns, and the person either stays signed in or discards them.
 * Pure: the screens call it, then clear the device store (`DeviceStore.reset`) only on "clear" or
 * after the person chooses to discard.
 */
import { CONFLICT_LABEL, type StoreState } from "./sync.ts";

export type SignOutPlan =
  | { readonly action: "clear" }
  | {
      readonly action: "warn";
      readonly unsynced: number;
      readonly conflicts: number;
      readonly message: string;
    };

const changes = (n: number): string =>
  n === 1
    ? "1 change on this device has not synced yet"
    : `${String(n)} changes on this device have not synced yet`;

const records = (n: number): string =>
  n === 1
    ? `1 record is marked "${CONFLICT_LABEL}"`
    : `${String(n)} records are marked "${CONFLICT_LABEL}"`;

/** Whether signing out may clear the device store now, or must first warn the person. */
export function signOutPlan(state: StoreState): SignOutPlan {
  const unsynced = Object.keys(state.pending).length;
  const conflicts = Object.keys(state.conflicts).length;
  if (unsynced === 0 && conflicts === 0) return { action: "clear" };
  const message =
    unsynced === 0
      ? `This device holds ${conflicts === 1 ? "1 record" : `${String(conflicts)} records`} marked "${CONFLICT_LABEL}". Stay signed in and choose a version, or sign out and discard this device's version.`
      : conflicts === 0
        ? `${changes(unsynced)}. Stay signed in until they sync, or sign out and discard them from this device.`
        : `${changes(unsynced)}, and ${records(conflicts)}. Stay signed in until they sync, or sign out and discard them from this device.`;
  return { action: "warn", unsynced, conflicts, message };
}
