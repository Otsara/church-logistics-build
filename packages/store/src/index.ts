/**
 * The offline store and sync (ARC-006, ARC-007, ARC-019; SYS-007; owner, 2026-11-21; ADR-052).
 */
export {
  CONFLICT_LABEL,
  edit,
  emptyState,
  keyOf,
  pendingEdits,
  pulled,
  pushed,
  resolve,
  view,
  type ConflictView,
  type HeldConflict,
  type PendingEdit,
  type PushResult,
  type RecordView,
  type StoreResult,
  type StoreState,
  type StoreView,
  type SyncedRecord,
} from "./sync.ts";
export {
  syncHolder,
  syncOnce,
  type StateHolder,
  type SyncOutcome,
  type Transport,
} from "./engine.ts";
export {
  openDeviceStore,
  type DeviceFactory,
  type DeviceStore,
} from "./device.ts";
export { supabaseTransport, type RpcClient } from "./supabase.ts";
