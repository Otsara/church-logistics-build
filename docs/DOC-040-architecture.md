---
id: DOC-040
title: Architecture and AI step contracts
version: 0.28
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

Lovable generates the UI and exports it to the repository; Claude Code owns everything outside `apps/*/ui`. Two stand-alone Lovable projects, each published on its lovable.app address; CI runs a smoke test that the published screens load and call the core rules (owner, 2026-11-12); OD-018. Phone, tablet and laptop, phone first, WCAG 2.2 AA (OD-035).

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

Date-only ISO strings, compared in UTC, to avoid time-zone bugs in shelf-life math. Implemented in `packages/core/src/dates.ts`, including the last day of a month for expiries printed as month and year only (OD-043).

### ARC-006 Storage
- Product: Shared
- Traces to: SYS-007
- Formerly: F-6

Local-first in the browser (IndexedDB), with team sync through Supabase when online and sign-in through Supabase Auth (owner, 2026-11-12); ADR-012. Works with spotty internet. Conflicts are flagged for a person (SYS-007). Fallback if sync proves problematic for the deadline: local-only (OD-001).

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

Built: `packages/ai/src/runner.ts` runs a step with a time limit given as an input, 30 seconds per attempt in the app (`limits.ts`; owner, 2026-11-16; OD-058), retries once on a timeout, an error or invalid output, then sends the person to manual entry, logging every call without the prompt or the model's text (ADR-031).

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

Built: `names.ts` replaces known names by their ids, whole-word and ignoring letter case, longest first; the runner refuses a prompt that still contains a known name and makes no call (ADR-031).

### ARC-014 Server-side AI gateway
- Product: Shared
- Traces to: SEC-001

The app calls the AI service only through a Supabase Edge Function that holds the key as a secret and checks that the user is signed in (owner, 2026-11-12); OD-027.

Built: `packages/ai/src/gateway.ts` answers only a signed-in user's POST of a known step, tier and non-empty prompt (401, 405 or 400 otherwise) and passes no detail of an AI service failure back (502). `anthropic.ts` calls Claude Haiku 5.5 for every step and tier (ADR-008) at low effort, with the SDK's own retries off and the 30-second limit (OD-058), and fails on any answer that was cut off, refused or paused. `gateway-client.ts` is the browser's model client: it sends the user's token, never the key. `supabase/functions/ai-gateway/` is the Deno wiring: the key comes from the function's secret `ANTHROPIC_API_KEY`, sign-in is checked with Supabase Auth, and browsers may call it only from origins listed in `ALLOWED_ORIGINS`, none by default, set when the apps are hosted (OD-018). For upload, `tools/gateway-upload.mjs` copies the gateway code into the function's folder unchanged, rewriting only import paths (Supabase uploads only files inside the folder); the result is type-checked with Deno before deploying. Deployed on 2026-11-16 from main (owner, 2026-11-16) as `ai-gateway` version 1 in the `prepped-sparewing` project, with Supabase's own sign-in check on, after the owner entered the key as a secret. Checked the same day, with no AI call: a request without sign-in was refused by Supabase (401); one with only the public app key reached the gateway, which started with its secrets in place and refused it (401, "sign in to use the AI steps"); a browser preflight from an unlisted website got no permission to call. A call with a signed-in user, and its timing, waits for sign-in in the apps (iteration 3).

### ARC-015 openFDA importer
- Product: Shared
- Traces to: DAT-101, SYS-103, SYS-109
- Safety-critical: yes

Reads FDA drug directory (openFDA NDC) product records into catalog entries in `packages/synth/src/fda.ts`. A product without a DEA schedule is read as not controlled in the US, with that basis recorded on the entry (owner, 2026-11-12); OD-044. Established pharmacologic classes (EPC) are kept as the entry's classes (OD-022). A biologic product type listed in the rule file makes the product out of scope with the reason "biologic, treated as cold chain" (owner, 2026-11-12); OD-049. A missing product type, or a dosage form beginning with an excluded form (GAS), also makes it out of scope (REV-002); the reason shown follows the order biologic, missing product type, dosage form, routes (owner, 2026-11-12); REV-001, OD-051. A route not listed in `rules/prepped/route-scope.json` makes the product out of scope; products merged across labelers keep the most cautious reading.

### ARC-016 Held-back split and seal
- Product: Shared
- Traces to: DAT-002

Sets aside one third of the records by a separate seed and seals them with SHA-256 fingerprints (`packages/synth/src/split.ts`). `packages/synth/src/corpus.ts` builds each product's scenarios from seeds derived from a corpus seed and splits each product separately. `packages/synth/scripts/build-corpus.ts` draws both seeds at random, writes the development part to `data/synthetic/development/`, the manifest to `data/synthetic/held-back-manifest.json`, and the held-back package, with the seeds, only outside the repository. A repository check (TC-026) shows no held-back record is committed.

### ARC-017 Repository policy checks
- Product: Shared
- Traces to: SEC-004, SEC-007

Tests in `packages/policy` that check rules holding for the whole repository, such as the CI dependency audit and the absence of committed credentials.

### ARC-018 Snapshot catalogue
- Product: Shared
- Traces to: DAT-101, SYS-109
- Safety-critical: yes

`packages/synth/src/snapshot.ts` builds the frozen in-scope catalogue from the FDA snapshot, keeping only products whose every reading is in scope. `packages/synth/scripts/import-fda.ts` refuses a file whose SHA-256, export date or record count differs from `data/fda/source.json`, and refuses a route rule file the owner has not verified. Output: `data/fda/catalog-2026-11-11.json`. These checks, and the refusal to write the held-back package inside the repository (only a path that climbs out of the repository counts as outside, REV-002), live in `packages/synth/src/data-checks.ts` under 100% coverage and mutation testing (REV-001).

### ARC-101 Prepped rules engine
- Product: Prepped
- Traces to: SYS-101, SYS-102, SYS-103, SYS-104, SYS-105, SYS-106, SYS-107, SYS-108, SYS-109, SYS-110, SYS-111, SYS-112, SYS-113, SYS-114, SYS-115, SYS-116, SYS-117
- Safety-critical: yes

Eligibility, route scope, floor coverage, the Go or No go indicator, readiness, supplements and comparable alternatives, as pure functions in `packages/core/src/prepped/`. No AI, network or clock.

Built so far: lot eligibility (`eligibility.ts`: discard, blocked, needs review or eligible, with every reason listed) and reading an expiry as printed on a label (`expiry.ts`: every unambiguous format, nothing guessed; ADR-022). Floor coverage, exchanges, the Go or No go indicator and the readiness meter (`floor.ts`). Merging donor lines into lots (`merge.ts`: lot number, name, strength, form, expiry and manufacturer must all match; OD-011, OD-054). The floor-list picker's label for controlled medicines (`picker.ts`, SYS-118). Comparable alternatives for a floor item (`alternatives.ts`, SYS-108), listed and labelled, for every floor item, and marked as offered when the item is short or needs review (`alternativesForFloor`); an alternative brings no class the item lacks (ADR-028); one the clinician chooses counts in `floor.ts` only the amount entered (OD-055). Route scope and controlled status come from the lot's catalogue entry (ARC-015). The minimum shelf life is read from `rules/prepped/shelf-life.json` (`shelf-life.ts`), a placeholder citing the WHO guidelines until a pharmacist or clinician checks it (OD-002).

### ARC-102 Prepped screens
- Product: Prepped
- Traces to: SYS-010, SYS-118

Lovable-generated screens in `apps/prepped/ui`, calling ARC-101 for every decision and recording sign-offs.

### ARC-301 SpareWing rules engine
- Product: SpareWing
- Traces to: SYS-301, SYS-302, SYS-303, SYS-304, SYS-305, SYS-306, SYS-307, SYS-308, SYS-309, SYS-310, SYS-311, SYS-312
- Safety-critical: yes

Candidates, missed-flight impact and plan ranking, as pure functions in `packages/core/src/sparewing/`. No AI, network or clock.

Built so far: part candidates (`parts.ts`; part numbers compared without spaces or letter case, and the quantity needed noted, ADR-030), pilot candidates (`pilots.ts`), missed community flights (`missed.ts`; data missing and cover aircraft per ADR-032), the ranked proposal (`rank.ts`) and recording a person's decision (`decision.ts`). The required ratings and the cover bases come from the program's two rule files, read by `rule-files.ts`: `rules/sparewing/aircraft-type-ratings.json` (ratings per aircraft type) and `rules/sparewing/cover-bases.json` (cover bases per community, per scenario). For the prototype both are placeholders derived from the synthetic data and citing it as their source (owner, 2026-11-15; OD-005, ADR-015). A type not listed requires no ratings, which the pilot check shows as data missing; a community not listed has no cover bases (null). The readers take the file's text through `json-text.ts`, which refuses a key named twice; aircraft types match ignoring spaces and letter case (ADR-034). For a real program the cover file will list bases per community rather than per scenario (OD-060). `dates.ts` adds `addDays` and `weekday` (ARC-005).

### ARC-302 SpareWing screens
- Product: SpareWing
- Traces to: SYS-010, SYS-312

Lovable-generated screens in `apps/sparewing/ui`, calling ARC-301 for every decision and recording sign-offs.

## 3. Data model

### Prepped

The rules table values are starting points. A pharmacist must check them before any real use.

| Entity | Key fields |
| --- | --- |
| Donor | id, name, type (hospital, pharmacy, clinic), state |
| Lot | id, donor id, generic name, strength, form, manufacturer, quantity, lot number, expiry date (date), storage, controlled (yes/no), cold chain (yes/no), source line |
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
- Traces to: SYS-001, SYS-002, SYS-119
- Formerly: AI-P1

Input: pasted text or spreadsheet rows. Output: JSON array of lots, each with the source line and a confidence. Tier: cheap. If it fails: manual entry form. Example output: `{"lots": [{"generic_name": "amoxicillin", "strength": "500 mg", "form": "capsule", "quantity": 1200, "lot_number": null, "expiry": "2027-06-30", "source_line": "Amoxicillin 500mg caps x1200 exp 6/2027", "confidence": 0.9}]}`

Built: `packages/ai/src/steps/donor-list.ts` with `lines.ts` (SYS-119, ADR-035): the prompt numbers the lines and asks for exact copies; the output schema has a field for each copied value and the confidence; `checkDonorList` keeps only copies written in the line, reads the expiry with `readExpiry`, marks what needs review and lists unread lines. Golden examples: `packages/ai/golden/aic-101-donor-list.json` (15, development partition), built by `packages/ai/scripts/make-golden.ts`; recorded through the gateway once sign-in exists, iteration 3 (OD-062).

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

Built: `packages/ai/src/steps/explain.ts` (ADR-039): `readinessFacts` turns the floor assessment into facts with refs; the AI answers in sentences, each with the refs it is about; `checkExplanation` rejects a sentence that adds a code, date, number or status not in those facts, or says a forbidden claim (`drafts.ts`), and the computed list is shown instead. The code, date and number check is `grounding.ts`.

### AIC-301 Parse a parts email or inventory list
- Product: SpareWing
- Traces to: SYS-001, SYS-002, SYS-313
- Formerly: AI-S1

Input: pasted text. Output: JSON array of parts with the source line and a confidence. Tier: cheap. If it fails: manual entry form.

Built: `packages/ai/src/steps/parts-email.ts` (SYS-313, ADR-035): part number, quantity and description only; base and serviceability are left for a person. Golden examples: `packages/ai/golden/aic-301-parts-email.json` (15); recorded through the gateway once sign-in exists, iteration 3 (OD-062). Both readers are part of the guard on AI output (ARC-008) and held to full coverage and mutation testing.

### AIC-302 Draft a message to a base or community
- Product: SpareWing
- Traces to: SYS-005, SYS-006, SYS-310
- Formerly: AI-S2

Input: disruption and chosen candidate. Output: draft text. Tier: stronger (see ADR-008). If it fails: show the blank template.

Built: `packages/ai/src/steps/message.ts` (ADR-039): ids only go to the AI; `checkMessage` refuses a forbidden claim or a code, date or number not in the input, and returns an accepted message as a draft (`drafts.ts`: "Draft, human review required" until a person marks it reviewed, which is audit logged). Nothing sends it.

### AIC-303 Explain the disruption plan
- Product: SpareWing
- Traces to: SYS-003, SYS-005
- Formerly: AI-S3

Input: computed candidates JSON. Output: plain-language summary of the candidates. Tier: stronger (see ADR-008). If it fails: show the computed list.

Built: `packages/ai/src/steps/explain.ts` with AIC-103: `planFacts` gives each ranked option its rank, whether it is proposed, missed flights, return to service, transfers and cost, with "unknown" where code could not compute them. These steps are part of the guard on AI output (ARC-008) and held to full coverage and mutation testing.

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
| 0.5 | 2026-11-12 | ARC-003 hosting and devices (OD-018, OD-035); ARC-006 sync and sign-in (OD-001); ARC-014 key store (OD-027); ARC-015 missing schedule (OD-044) (owner, 2026-11-12). | Claude, for owner review |
| 0.6 | 2026-11-12 | ARC-015 reads EPC classes (OD-022); ARC-016 corpus builder and scripts; new ARC-018 snapshot catalogue. | Claude, for owner review |
| 0.7 | 2026-11-12 | ARC-015: biologic product types out of scope (OD-049). | Claude, for owner review |
| 0.8 | 2026-11-12 | ARC-015 missing product type and excluded dosage forms; ARC-018 data checks tested (REV-001); ARC-102 traces SYS-118. | Claude, for owner review |
| 0.9 | 2026-11-12 | ARC-015 dosage-form prefix match; ARC-018 held-back path check fixed (REV-002). | Claude, for owner review |
| 0.10 | 2026-11-12 | ARC-005 month-end date; ARC-101 lot eligibility, expiry reading and the shelf-life rule file built. | Claude, for owner review |
| 0.12 | 2026-11-13 | ARC-301 SpareWing candidate rules built; ARC-005 addDays and weekday. Numbered 0.12 because the floor-coverage branch takes 0.11. | Claude, for owner review |
| 0.13 | 2026-11-13 | ARC-101 floor coverage, exchanges, indicator and meter built; Lot has a manufacturer (OD-054). (prepared as 0.11 on the floor-coverage branch, renumbered after the SpareWing merge) | Claude, for owner review |
| 0.14 | 2026-11-15 | ARC-101 donor-line merging built. | Claude, for owner review |
| 0.15 | 2026-11-15 | ARC-101 picker label for controlled medicines built. Numbered 0.15 because open branches take 0.13 and 0.14. | Claude, for owner review |
| 0.16 | 2026-11-15 | ARC-101 comparable alternatives built. Chosen alternatives counted in floor.ts (OD-055). | Claude, for owner review |
| 0.17 | 2026-11-15 | ARC-101: alternatives listed for every floor item and marked as offered when short; no extra classes (ADR-028). | Claude, for owner review |
| 0.18 | 2026-11-15 | ARC-301: part numbers compared without spaces or letter case; quantity needed (SYS-311, ADR-030). | Claude, for owner review |
| 0.19 | 2026-11-16 | ARC-008 runner and ARC-013 name replacement built (ADR-031 proposed; OD-058). | Claude, for owner review |
| 0.20 | 2026-11-16 | ARC-301: SpareWing review decisions built (ADR-032). Numbered 0.20 because the AI runner branch takes 0.19. | Claude, for owner review |
| 0.21 | 2026-11-16 | ARC-301: the two SpareWing rule files written as placeholders from the synthetic data (OD-005). Numbered 0.21 because open branches take 0.19 and 0.20. | Claude, for owner review |
| 0.22 | 2026-11-16 | ARC-008: ADR-031 accepted; AI call time limit 30 seconds per attempt (OD-058). | Claude, for owner review |
| 0.23 | 2026-11-16 | ARC-301: rule files read from text with duplicate keys refused; aircraft types matched without spaces or case (ADR-034). | Claude, for owner review |
| 0.24 | 2026-11-16 | ARC-014 AI gateway built (not yet deployed). Numbered 0.24 because the rule-files review branch takes 0.23. | Claude, for owner review |
| 0.25 | 2026-11-16 | ARC-014: upload packaging script; key entered by the owner. | Claude, for owner review |
| 0.26 | 2026-11-16 | ARC-014: AI gateway deployed and checked without an AI call (owner, 2026-11-16). | Claude, for owner review |
| 0.27 | 2026-11-16 | AIC-101 and AIC-301 built with golden examples (ADR-035; recordings pending, OD-062). Numbered 0.27 because the deployment-record branch takes 0.26. | Claude, for owner review |
| 0.28 | 2026-11-16 | AIC-103, AIC-302, AIC-303 built (ADR-039); AIC-102 follows with the synthetic rule cards. | Claude, for owner review |
