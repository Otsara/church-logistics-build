---
id: ADR-052
title: The offline store keeps versioned records and an outbox on the device, syncs through Supabase, and holds conflicts for a person
status: Accepted
date: 2026-11-21
decided: owner, 2026-11-21
---

# ADR-052 Offline store and sync design

## Context

ADR-012 settled the shape: records live on the device first and sync through Supabase when online; one account per person, each team sees only its own records; a conflicting record is marked "Conflict: check", is not counted until a person chooses a version, and keeps both versions in the audit log (OD-001, OD-017, SEC-008). If sync proves too much for the deadline, the build falls back to device-only storage and the owner is told.

On 2026-11-21, with five days to the planned submission, the store was not yet built. Lovable's screens already reach their data through a small interface, so the store can replace the demo's in-memory store without changing a screen.

## Options

1. **Scope by the deadline:**
   - (a) full sync as ADR-012 says, with a checkpoint at the end of 2026-11-24: if two devices do not yet sync and hold conflicts as TC-001 and TC-023 require, switch to device-only and tell the owner;
   - (b) device-only now, sync as future work.
2. **Demo mode:** (a) without sign-in, data stays on that device only, with a "Reset demo data" button, and signing in turns sync on; (b) other.
3. **SpareWing screens:** (a) after the submission, since only one product is submitted and Prepped is the default (OD-031), adding them before 2026-11-26 only if time allows; (b) before the submission.
4. **Opening with no network:** add a service worker so the app loads offline (ARC-007): yes or no.

## Decision

Owner, 2026-11-21: **1 (a)**, **2 (a)**, **3 (a)** ("should there prove bandwidth and time to work on SpareWing screens, tack it on") and **4 yes**.

The design (ARC-019):

- **Records.** Every synced thing is a record: its kind, its id, its team, a version number given by the server, its data, and who changed it and when. Audit entries are records too, written once and never changed.
- **On the device.** The last synced copy of each record, an outbox of edits not yet synced (each with the version it was edited from), the conflicts waiting for a person, the audit entries and a pull cursor, kept in the browser's IndexedDB.
- **Sync.** Each edit is pushed with the version it was edited from. The server accepts it only if that is still the current version, and gives it the next version; otherwise it answers with the current record, and the device holds a conflict. Then the device pulls every record changed since its cursor. A pulled record that is newer than the version a waiting edit was based on is also a conflict.
- **Conflicts.** A record in conflict is left out of what the screens and the rules see ("Conflict: check"; a lot is not counted) until a person chooses a version. Both versions go in the audit log when the conflict arises, and the choice goes in with who made it. The chosen version is then pushed as a new edit.
- **Where the logic lives.** The sync rules above are pure functions in `packages/store`, safety-critical because a conflict decides whether a lot is counted: full coverage, mutation testing and the owner's review (ADR-006). The Supabase calls go through an interface the screens supply a client for, so the generated folder still imports nothing but zod (ADR-048).
- **Server.** A records table and a team-membership table in the Supabase project, with database rules so a person reads and writes only their team's records, and two database functions: push with the version check, and pull since a cursor. The owner sees every database change before it is applied.

## Consequences

- TC-001 and TC-023 become real tests of the sync rules against an in-memory stand-in for the server; TC-024's team separation is tested against the database rules. New TC-032 covers the device store surviving a reload, and the demo's reset.
- The checkpoint is the end of 2026-11-24 (Central time).
- The SpareWing screens move after the submission unless time allows (DOC-100).
- A device that has never signed in never sends anything anywhere.
