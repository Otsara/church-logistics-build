---
id: ADR-012
title: Team sync, sign-in and the AI key
status: Accepted
date: 2026-11-12
decided: owner, 2026-11-12
---

# ADR-012 Team sync, sign-in and the AI key

## Context

Both products must work offline (SYS-007). A team sharing data needs sync, and sync needs sign-in, which brings its own risks (HAZ-008). The AI key must never reach the browser or the repository (SEC-001). OD-001, OD-017 and OD-027.

## Options

1. Local-only browser storage: simplest, no sign-in, no shared data.
2. Local-first with Supabase sync and sign-in: shared team data, more to build.
3. Cloud-only: fails offline use.

For conflicts: flag for a person; latest edit wins; most cautious value wins.

## Decision

Option 2 (owner, 2026-11-12), with a fall-back to option 1 if the sync build proves problematic for the deadline; the owner is told if that happens. A conflicting record is flagged "Conflict: check" and treated as not settled until a person chooses a version. The Anthropic key is a Supabase Edge Function secret, entered by the owner; the function checks the user is signed in.

## Consequences

- ARC-006, ARC-014, SYS-007, SEC-001, new SEC-008, HAZ-008, RC-008, TC-023, TC-024.
- Sign-in never blocks offline work on a device that has signed in.
- A conflict can hold a lot or pilot out of the result until a person settles it; the screen must make that visible.
