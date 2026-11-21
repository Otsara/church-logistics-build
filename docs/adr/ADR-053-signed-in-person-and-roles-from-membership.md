---
id: ADR-053
title: When signed in, the person and their roles come from the team membership the owner sets, and the server refuses changes under anyone else
status: Accepted
date: 2026-11-21
decided: owner, 2026-11-21
---

# ADR-053 Signed-in person and roles from the team membership

## Context

The owner's line-by-line review of the offline store (REV-017) found that the screens let anyone choose whom they are "Acting as", including the lead clinician who signs off the packing list (SYS-010). That suits the demo without sign-in, but once people sign in and sync, a person could sign off as someone else, and the server recorded the app's person id as given by the device.

## Options

- (a) Link each account to one person of the team, with that person's roles, in `team_members`, set only by the owner. When signed in, "Acting as" is fixed to that person and those roles, and `push_record` refuses a change recorded under anyone else. Without sign-in, the demo keeps the selector.
- (b) Keep the selector when signed in and rely on the audit log.

## Decision

Owner, 2026-11-21: **(a)**.

- `team_members` gains `person_id` (one account per person per team) and `roles` (any of trip coordinator, lead clinician, team leader, team member).
- `push_record` raises an error, and changes nothing, when the signed-in account is not in the team or the change is recorded under another person.
- The screens read the signed-in person's own membership to fix "Acting as" and the roles; a person's roles cannot be changed through the app.

## Consequences

- Sign-off authority (SYS-010) rests on the account, not on a choice in the screen, whenever sync is on.
- The migration `20261121000002_signed_in_person_and_roles.sql` is shown to the owner before it is applied.
- TC-024's database test also checks that a change under another person is refused.
