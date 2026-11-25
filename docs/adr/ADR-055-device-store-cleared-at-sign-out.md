---
id: ADR-055
title: Data on devices is protected by the device itself while signed in, and the app clears its store at sign-out, warning first when work has not synced
status: Accepted
date: 2026-11-23
decided: owner, 2026-11-23
---

# ADR-055 Device store cleared at sign-out

## Context

The offline store keeps a team's records, waiting edits, held conflicts and audit entries in the browser (ADR-052). OD-033 asked how that data is protected if a device is lost or shared (SEC-006). TC-024 already required that signing out with unsynced edits warns, rather than losing them silently. With the deadline four days away, any option had to be small and testable.

## Options

- (a) Rely on the device's own protection while a person is signed in, and clear the device store at sign-out. Warn first when work has not synced, and state the lack of app-level encryption as a known limitation.
- (b) Encrypt the device store with a key tied to sign-in.

## Decision

Owner, 2026-11-23: **(a)** (D3). The follow-up was agreed the same day: when edits are waiting or a conflict is held, signing out warns with the counts. The person then either stays signed in until they sync, or signs out and discards them from the device. Nothing is cleared until the person chooses.

## Consequences

- `signOutPlan` in `packages/store/src/sign-out.ts` decides whether sign-out may clear the store or must warn first (TC-018). The screens call it, then `DeviceStore.reset`.
- A lost device that is still signed in exposes the team's data to anyone who can unlock it. The submission says so, and app-level encryption (option b) remains to be done before real-world use.
- TC-024's sign-out wording now follows this decision: unsynced edits are kept until they sync, unless the person chooses to discard them.
