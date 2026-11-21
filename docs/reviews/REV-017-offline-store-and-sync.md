---
id: REV-017
title: Line-by-line review of the offline store and team sync
date: 2026-11-21
---

# REV-017 Line-by-line review of the offline store and team sync

## Reviewed

The pull request "Shared: offline store and team sync, with conflicts held for a person" (#49), walked through in the build conversation on 2026-11-21 (ARC-019; SYS-007, SYS-008, SEC-008; ADR-052):

- `packages/store/src/sync.ts`: records and versions; `edit`, `pushed` and `holdConflict`, `pulled`, `resolve`, `view`.
- `packages/store/src/engine.ts`: one sync pushes every waiting edit oldest first, then pulls; stops at the first failure and keeps what synced; applies results to the latest state.
- `packages/store/src/device.ts`: one state object in IndexedDB; reset; connection closed after each use.
- `packages/store/src/supabase.ts`: the two database functions, every answer checked, an empty answer taken as "not in this record's team".
- `supabase/migrations/`: the tables, database rules and functions, applied with the owner's approval on 2026-11-21, with the sequence grant and the membership check running as the caller.

Evidence at review: 25 store tests passing; 100% coverage of `packages/store/src`; Stryker 100% on the four files; Supabase's security advisor reporting no findings.

## Findings and decisions

| # | Finding | Decision |
|---|---|---|
| 1 | When signed in, the screens would still let a person act as anyone, including the lead clinician (SYS-010), and the server took the app's person id as given. | (a): each account is linked to one person of the team with their roles, set only by the owner; "Acting as" is fixed when signed in, and `push_record` refuses a change under anyone else (owner, 2026-11-21; ADR-053). |
| 2 | The server keeps both the app's person id and the signed-in account that wrote the row. | Keep both; with finding 1 they always match for signed-in people. |
| 3 | Keys are "kind/id", so a kind containing "/" could share a key with another record. Kinds are fixed in code, so it cannot happen today. | Refuse a kind containing "/" (owner, 2026-11-21). Built, test first. |
| 4 | Nothing can be deleted through the app. | Accepted as designed. |

The owner accepted the store code as reviewed on 2026-11-21.

## Outcome

- Finding 3 is built in `sync.ts`, with its test.
- Finding 1's migration `20261121000002_signed_in_person_and_roles.sql` is written and shown to the owner before it is applied; the screens' part goes into the Lovable message that brings in the store.
