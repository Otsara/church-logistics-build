---
id: DOC-060
title: Security and privacy
version: 0.6
status: Draft
effective_date:
---

# DOC-060 Security and privacy

What protects the people, data and services behind Prepped and SpareWing. During the hackathon build only synthetic data exists, so these requirements are designed now and verified before any real-world use.

## Requirements

### SEC-001 AI keys held server-side only
- Product: Shared
- Traces to: UN-002, RC-007

AI service keys never appear in front-end code, the repository, logs or review copies. They are held as server-side secrets and used only by the AI gateway (ARC-014). Store: a Supabase Edge Function secret, entered by the owner (owner, 2026-11-12); OD-027. Built: only the Edge Function reads the key, from its secret `ANTHROPIC_API_KEY`; the browser's client sends the user's token and never holds the key; failures from the AI service are not passed back (ARC-014, TC-028, TC-030).

### SEC-002 Synthetic data only in the build
- Product: Shared
- Traces to: UN-002, RC-004

The repository, tests, golden examples, demo and video contain only synthetic data (DAT-003). No real names, records or health data.

### SEC-003 Encrypted transport and safe headers
- Product: Shared
- Traces to: UN-002, RC-004

Every connection uses HTTPS. Published apps send security headers that block framing and third-party scripts. The header set is fixed when hosting is set up on lovable.app (OD-018) in IT-003 and recorded here.

### SEC-004 Dependency vulnerabilities checked
- Product: Shared
- Traces to: UN-002, RC-007

CI runs a dependency audit on every pull request and fails on high or critical advisories. New dependencies are registered in DOC-090 before use. Temporary exception: GHSA-fc5q-39xc-vjpf, a ReDoS in `picomatch` 4.0.7 and earlier, reached only through development tools and with no patched version yet, is ignored until a patched version exists; a scheduled task checks twice a day, and the exception is removed before the submission (owner, 2026-11-17; ADR-043).

### SEC-005 Least data to AI services
- Product: Shared
- Traces to: UN-002, RC-004

Each AI step receives only the fields it needs, after names are replaced by ids (ARC-013). Pilot and donor names are never sent.

### SEC-006 Data at rest on devices
- Product: Shared
- Traces to: UN-002, RC-004

Protection of data kept in the browser if a device is lost or shared: The device's own protection (screen lock, disk encryption) guards the data while a person is signed in, and the app clears its device store when they sign out. With edits waiting to sync or a conflict held, signing out first warns with the counts; the person either stays signed in until they sync, or signs out and discards them from the device. Nothing is encrypted by the app itself in this build, which the submission states as a known limitation (D3; ADR-055) (owner, 2026-11-23). `signOutPlan` in `packages/store/src/sign-out.ts` decides whether signing out may clear the store or must warn first (TC-018). App-level encryption of the device store remains for before real-world use.

### SEC-007 No secrets in commits
- Product: Shared
- Traces to: RC-007

`.env` files are ignored by git; secrets are never committed. Before the repository is made public, its full history is scanned for secrets (OD-021).

### SEC-008 Team sign-in for sync
- Product: Shared
- Traces to: UN-002, RC-008

Sync uses Supabase Auth with one account per person. Database rules let each team read and write only its own records, and every synced edit records who made it. Signing in is needed only to sync; a device that has signed in keeps working offline. Sign-in details are never logged or committed (owner, 2026-11-12); OD-001. The AI gateway answers only a request carrying a signed-in user's token, checked with Supabase Auth; a failed check counts as not signed in (TC-028). The database rules are in `supabase/migrations/` and were applied to the project on 2026-11-21 (owner, 2026-11-21): a person reads and writes only the records of teams they belong to, memberships are set only by the owner, no record can be deleted through the app, every row records the signed-in user who wrote it, and the membership check runs with the caller's own rights; Supabase's security advisor reports no findings (ADR-052). When signed in, the person and their roles come from the team membership the owner sets, "Acting as" is fixed to that person, and `push_record` refuses a change recorded under anyone else (owner, 2026-11-21; ADR-053).

## Revision history

| Version | Date | Change | By |
| --- | --- | --- | --- |
| 0.1 | 2026-11-10 | First draft. | Claude, for owner review |
| 0.2 | 2026-11-12 | SEC-001 key store decided (OD-027); SEC-003 header set follows hosting (OD-018); new SEC-008 team sign-in (OD-001) (owner, 2026-11-12). | Claude, for owner review |
| 0.3 | 2026-11-16 | SEC-001 and SEC-008: the AI gateway built; key read only by the Edge Function, sign-in checked on every AI request. | Claude, for owner review |
| 0.4 | 2026-11-17 | SEC-004: temporary exception for GHSA-fc5q-39xc-vjpf (picomatch, development tools only, no patch yet) until a patched version exists (ADR-043). | Claude, for owner review |
| 0.5 | 2026-11-21 | SEC-008: the sync tables' database rules applied to the Supabase project; the signed-in person and roles come from the membership (owner, 2026-11-21; ADR-052, ADR-053). | Claude, for owner review |
| 0.6 | 2026-11-23 | SEC-006: data on devices protected as decided in OD-033 (owner, 2026-11-23, D3). | Claude, for owner review |
