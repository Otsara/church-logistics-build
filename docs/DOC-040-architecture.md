---
id: DOC-040
title: Architecture and AI step contracts
version: 0.4
status: Draft
effective_date:
---

# DOC-040 Architecture and AI step contracts

How the two products are built, which parts are safety-critical, and the contract every AI step follows. Architecture elements (ARC) carried over from `docs/BUILD_SPEC.md` keep their wording and old IDs (ADR-001). Elements marked `Safety-critical: yes` are verified to ADR-006: 100% branch coverage, a mutation score of at least 80% on changed code, and the owner's line-by-line review.

## 1. Foundation decisions

These were proposals to confirm in the build spec; each can change if the build shows a problem, through an ADR.

### ARC-001 Language
- Product: Shared
- Formerly: F-1

TypeScript throughout. One language for rules, tests and screens.

### ARC-002 Layout
- Product: Shared
- Traces to: SYS-003
- Formerly: F-2

`packages/core` (pure rules), `packages/ai` (model wrapper), `packages/synth` (seed data), `packages/store` (offline storage and sync), `apps/prepped`, `apps/sparewing`. Added 2026-11-12: `packages/policy` (repository policy tests, ARC-017). Rules stay testable without screens. Core has no network, no clock and no AI imports, enforced by lint.

### ARC-003 Screens
- Product: Shared
- Formerly: F-3

Lovable generates the UI and exports it to the repository; Claude Code owns everything outside `apps/*/ui`. Projects, hosting and devices: TBD (OD-018, OD-035).

### ARC-004 Rule files
- Product: Shared
- Traces to: SYS-004, SYS-102
- Formerly: F-4

JSON files in `/rules`, loaded by core, so a pharmacist or mechanic can read and correct them. Every file cites a source link; a verified file also records its verified date and verifier (`rules/README.md`).

### ARC-005 Dates
- Product: Shared
- Traces to: SYS-101
- Safety-critical: yes
- Formerly: F-5

Date-only ISO strings, compared in UTC, to avoid time-zone bugs in shelf-life math. Implemented in `packages/core/src/dates.ts`.

### ARC-006 Storage
- Product: Shared
- Traces to: SYS-007
- Formerly: F-6

Local-first in the browser (IndexedDB), optional cloud sync. Works with spotty internet. Choice of sync service: TBD (OD-001).

### ARC-007 Offline
- Product: Shared
- Traces to: SYS-007
- Formerly: F-7

Installable web app that queues changes and syncs later. Matches MARC's connectivity.

### ARC-008 AI wrapper
- Product: Shared
- Traces to: SYS-001, SYS-002, SYS-009
- Safety-critical: yes
- Formerly: F-8

One typed function per task, JSON validated against a schema, one retry, then a manual fallback. A bad or missing AI answer never blocks work. The wrapper is the guard on every AI output.

### ARC-009 Model tiers
- Product: Shared
- Traces to: SYS-009
- Formerly: F-9

Cheap model for parsing, stronger model for drafts and explanations, set by config, so it is swappable and cost stays low. Updated by ADR-008: every step starts on the lowest-cost model (Claude Haiku 5.5); a stronger tier is used for a step only if its golden tests show the need and the owner agrees.

### ARC-010 Tests
- Product: Shared
- Formerly: F-10

Vitest unit tests, plus golden-file tests for AI steps run on recorded outputs. Repeatable without calling a model.

### ARC-011 Audit
- Product: Shared
- Traces to: SYS-008
- Formerly: F-11

Log every AI call and every human sign-off.

### ARC-012 Synthetic data
- Product: Shared
- Traces to: DAT-001
- Formerly: F-12

Seeded random generator: the same seed gives the same data, for a reproducible demo and tests.

## 2. Elements added in this document set

### ARC-013 Pseudonymisation before AI calls
- Product: Shared
- Traces to: SYS-006, SEC-005

Before any AI call, names are replaced by ids and only the fields the step needs are sent. Lives in `packages/ai`.

### ARC-014 Server-side AI gateway
- Product: Shared
- Traces to: SEC-001

The app calls the AI service only through a server function that holds the key as a secret. Proposed: a Supabase Edge Function (OD-027).

### ARC-015 openFDA importer
- Product: Shared
- Traces to: DAT-101, SYS-103, SYS-109
- Safety-critical: yes

Reads FDA drug directory (openFDA NDC) product records into catalog entries in `packages/synth/src/fda.ts`. Controlled status is "unknown" when the record does not say; a route not listed in `rules/prepped/route-scope.json` makes the product out of scope; products merged across labelers keep the most cautious reading.

### ARC-016 Held-back split and seal
- Product: Shared
- Traces to: DAT-002

Sets aside one third of the records by a separate seed and seals them with SHA-256 fingerprints (`packages/synth/src/split.ts`).

### ARC-017 Repository policy checks
- Product: Shared
- Traces to: SEC-004, SEC-007

Tests in `packages/policy` that check rules holding for the whole repository, such as the CI dependency audit and the absence of committed credentials.

### ARC-101 Prepped rules engine
- Product: Prepped
- Traces to: SYS-101, SYS-102, SYS-103, SYS-104, SYS-105, SYS-106, SYS-107, SYS-108, SYS-109, SYS-110, SYS-111, SYS-112, SYS-113, SYS-114, SYS-115, SYS-116, SYS-117
- Safety-critical: yes

Eligibility, route scope, floor coverage, the Go or No go indicator, readiness, supplements and comparable alternatives, as pure functions in `packages/core/src/prepped/`. No AI, network or clock.

### ARC-102 Prepped screens
- Product: Prepped
- Traces to: SYS-010

Lovable-generated screens in `apps/prepped/ui`, calling ARC-101 for every decision and recording sign-offs.

### ARC-301 SpareWing rules engine
- Product: SpareWing
- Traces to: SYS-301, SYS-302, SYS-303, SYS-304, SYS-305, SYS-306, SYS-307, SYS-308, SYS-309, SYS-310
- Safety-critical: yes

Candidates, missed-flight impact and plan ranking, as pure functions in `packages/core/src/sparewing/`. No AI, network or clock.

### ARC-302 SpareWing screens
- Product: SpareWing
- Traces to: SYS-010

Lovable-generated screens in `apps/sparewing/ui`, calling ARC-301 for every decision and recording sign-offs.

## 3. Data model

### Prepped

The rules table values are starting points. A pharmacist must check them before any real use.

| Entity | Key fields |
| --- | --- |
| Donor | id, name, type (hospital, pharmacy, clinic), state |
| Lot | id, donor id, generic name, strength, form, quantity, lot number, expiry date (date), storage, controlled (yes/no), cold chain (yes/no), source line |
| Trip | id, destination country, arrival date, team size, clinician types, expected patients, import permit obtained (yes/no) |
| Need | trip id, item category, target quantity, priority (1–3) |
| Match | lot id, trip id, quantity, days remaining at arrival, status (eligible, blocked, needs review), reason |
| Rule card | country, import permit required, ministry letter required, restricted classes, notes, source link, verified date, verified by |
| Document draft | trip id, type, text, status (draft, reviewed), reviewer |
| Audit entry | time, actor (person or AI step), action, before, after |

### SpareWing

Every list of parts, pilots and lead times is entered by the program. The tool never assumes interchangeability, currency or transit times.

| Entity | Key fields |
| --- | --- |
| Base | id, name, road access (yes/no), connectivity note |
| Aircraft | id, tail number, type, base id, status (flying, grounded, in maintenance), grounded since |
| Part | id, part number, listed alternate part numbers, description, base id, quantity, serviceable (yes/no) |
| Pilot | id, name (stored locally only, never sent to AI), base id, ratings, currency dates, availability windows |
| Community | id, name, base id, flights per week, flight days |
| Transfer mode | from base, to base, mode (air, mail, road), entered lead time in days |
| Disruption | id, type (part or pilot), aircraft or pilot id, start date, expected end |
| Candidate | disruption id, option (part or pilot), source base, transfer mode, ETA, flags, status |
| Audit entry | time, actor, action, before, after |

## 4. AI step contracts

Every step follows SYS-001 to SYS-006 and SYS-009, and runs through ARC-008, ARC-013 and ARC-014.

### AIC-101 Parse a donor list
- Product: Prepped
- Traces to: SYS-001, SYS-002
- Formerly: AI-P1

Input: pasted text or spreadsheet rows. Output: JSON array of lots, each with the source line and a confidence. Tier: cheap. If it fails: manual entry form. Example output: `{"lots": [{"generic_name": "amoxicillin", "strength": "500 mg", "form": "capsule", "quantity": 1200, "lot_number": null, "expiry": "2027-06-30", "source_line": "Amoxicillin 500mg caps x1200 exp 6/2027", "confidence": 0.9}]}`

### AIC-102 Draft a cover letter and checklist
- Product: Prepped
- Traces to: SYS-004, SYS-005
- Formerly: AI-P2

Input: trip, rule card, matched lots. Output: draft text citing the rule card id. Tier: stronger (see ADR-008). If it fails: show the blank template.

### AIC-103 Explain readiness gaps
- Product: Prepped
- Traces to: SYS-003, SYS-005
- Formerly: AI-P3

Input: computed readiness JSON. Output: plain-language summary of gaps only. Tier: stronger (see ADR-008). If it fails: show the computed list.

### AIC-301 Parse a parts email or inventory list
- Product: SpareWing
- Traces to: SYS-001, SYS-002
- Formerly: AI-S1

Input: pasted text. Output: JSON array of parts with the source line and a confidence. Tier: cheap. If it fails: manual entry form.

### AIC-302 Draft a message to a base or community
- Product: SpareWing
- Traces to: SYS-005, SYS-006, SYS-310
- Formerly: AI-S2

Input: disruption and chosen candidate. Output: draft text. Tier: stronger (see ADR-008). If it fails: show the blank template.

### AIC-303 Explain the disruption plan
- Product: SpareWing
- Traces to: SYS-003, SYS-005
- Formerly: AI-S3

Input: computed candidates JSON. Output: plain-language summary of the candidates. Tier: stronger (see ADR-008). If it fails: show the computed list.

Each step gets 10–20 recorded golden examples drawn from the development partition (DAT-004). A change that breaks them fails the tests.

## 5. Toolchain

The toolchain, its settings and their reasons are in `docs/TOOLCHAIN.md` (supporting file, governed by this document). Third-party components are registered in DOC-090.

## Revision history

| Version | Date | Change | By |
| --- | --- | --- | --- |
| 0.1 | 2026-11-10 | First draft. Foundation decisions F-1..F-12 carried over as ARC-001..012 and AI steps AI-P1..AI-S3 as AIC-101..103, AIC-301..303, wording unchanged (ADR-001). New: ARC-013, ARC-014, ARC-101, ARC-102, ARC-301, ARC-302; safety-critical units marked (ADR-006); ARC-009 updated by ADR-008. | Claude, for owner review |
| 0.2 | 2026-11-10 | ARC-101 allocated SYS-109 to SYS-114. | Claude, for owner review |
| 0.3 | 2026-11-11 | ARC-101 allocated SYS-115 to SYS-117. | Claude, for owner review |
| 0.4 | 2026-11-12 | New ARC-015 openFDA importer (safety-critical), ARC-016 held-back split and seal, ARC-017 repository policy checks; ARC-002 adds packages/policy. | Claude, for owner review |
