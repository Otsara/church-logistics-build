# Build spec for Claude Code

Exported from the "Build spec" tab of the specs doc (https://claude.ai/artifact/KidYyKqH3HUeydraCFK4Vg). If this file and the doc disagree, this file governs the build. Update it here first.

Both products are built in parallel on one shared foundation, in a hybrid of Lovable for screens and Claude Code for rules, data and tests, using synthetic data only.

## Decisions and build order

Decided on Nov 4: build Prepped and SpareWing in parallel, use Lovable for screens and Claude Code for rules, data and tests, and use synthetic data only. The hackathon allows one project and one track per team, so only one product is submitted. The other stays as a working prototype.

1. Core package: date math, rules engine, test harness.
2. Synthetic data generator with a fixed seed.
3. AI wrapper with fake responses for tests.
4. Prepped screens.
5. SpareWing screens.
6. Offline storage and sync.
7. Demo script, evaluation run and the 5-minute video.

Both products build in parallel to step 7. The Nov 7 rule sets Prepped as the default submission: it is chosen unless a SpareWing aviation contact confirms the pain. SpareWing is not polished past step 3 until that happens.

## Shared foundation

These are proposals to confirm, not facts. Each row can change if the build shows a problem.

| Area | Proposed decision | Why |
| --- | --- | --- |
| Language | TypeScript throughout | One language for rules, tests and screens |
| Layout | `packages/core` (pure rules), `packages/ai` (model wrapper), `packages/synth` (seed data), `apps/prepped`, `apps/sparewing` | Rules stay testable without screens |
| Screens | Lovable generates the UI and exports to the repo; Claude Code owns everything outside `apps/*/ui` | Fast demo, with control of the logic |
| Rules | JSON files in `/rules`, loaded by core | A pharmacist or mechanic can read and correct them |
| Dates | Date-only ISO strings, compared in UTC | Avoids time-zone bugs in shelf-life math |
| Storage | Local-first in the browser (IndexedDB), optional cloud sync | Works with spotty internet |
| Offline | Installable web app that queues changes and syncs later | Matches MARC's connectivity |
| AI wrapper | One typed function per task, JSON validated against a schema, one retry, then a manual fallback | A bad or missing AI answer never blocks work |
| Model tiers | Cheap model for parsing, stronger model for drafts and explanations, set by config | Swappable, and cost stays low |
| Tests | Vitest unit tests, plus golden-file tests for AI steps run on recorded outputs | Repeatable without calling a model |
| Audit | Log every AI call and every human sign-off | Supports the responsible-AI score |
| Synthetic data | Seeded random generator, same seed gives the same data | Reproducible demo and tests |

## Prepped: data model and rule tables

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

**Eligibility rules, all in code, none in AI:**

1. Days remaining at arrival = expiry date minus trip arrival date.
2. Default minimum is 12 months remaining at arrival, taken from WHO guidance. A rule can lower it for a direct donation, set per item category in `/rules/shelf-life.json`.
3. Controlled substances are always blocked.
4. Cold-chain items are blocked unless the trip is marked able to receive them.
5. A lot with no expiry date is "needs review" and does not count toward readiness.

**Readiness meter:** need coverage counts 70% and document completion 30%. Coverage per item is eligible quantity over target, capped at 100%, weighted by priority. Any blocking issue, such as a missing import permit, caps the meter at "Not ready". The 70/30 split is an assumption to adjust after reviewer feedback.

**Rule card example (placeholder, verify before use):** Honduras. A US Embassy advisory urged filing customs forms at least three business days ahead. Cards for Ethiopia, the Philippines and Nigeria are to be filled from official sources, each with a source link and verified date.

## SpareWing: data model and rule tables

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

**Candidate rules, all in code, none in AI:**

1. A part is a candidate only if it has the same part number or a listed alternate that the program entered. The tool never decides two parts are interchangeable.
2. Parts marked not serviceable never appear.
3. A pilot is a candidate only if the entered ratings and currency dates meet the aircraft's requirement and availability is known.
4. Missing data shows as "unknown", never as a silent exclusion or a silent pass.
5. Every candidate carries the flag "requires sign-off by a licensed mechanic or the operator". The tool never says approved.
6. If no candidates exist, the result says so and shows the local order lead time, if one was entered.

**Coverage impact:** missed community flights = flights scheduled between the disruption start and expected end for communities served by the grounded aircraft, minus flights another aircraft or pilot can cover.

## Acceptance tests

Each case becomes an automated test. The numbers below are worked so the expected result is exact.

**Prepped**

1. P-1: Given a lot expiring 2027-03-01 and a trip arriving 2026-12-01, when eligibility runs with the 12-month rule, then the lot is blocked with the reason "90 days remaining, 12 months required".
2. P-2: Given a lot expiring 2028-01-15 and the same trip, then it is eligible with 410 days remaining.
3. P-3: Given a lot marked controlled, then it is blocked whatever its expiry.
4. P-4: Given a lot with no expiry date, then it is "needs review" and excluded from readiness.
5. P-5: Given a destination card that requires an import permit and no permit marked obtained, then readiness shows "Not ready" and the document draft lists the missing permit.
6. P-6: Given a target of 200 courses and 150 eligible, then item coverage is 75%.
7. P-7: Given two donor lines with the same lot number and generic name, then they merge into one lot with summed quantity.
8. P-8: Given the arrival date moves 30 days later, then eligibility recalculates without calling any AI step.

**SpareWing**

1. S-1: Given a grounded aircraft needing part A, a listed alternate B, and one B at base 2, then B appears as a candidate with source base, transfer mode, ETA and the sign-off flag.
2. S-2: Given no stock and no alternate, then the result says no candidates were found, to ask a human, and shows any entered order lead time.
3. S-3: Given a pilot whose entered currency lapsed, then the pilot is excluded with the reason shown.
4. S-4: Given a pilot with no availability data, then the pilot shows as "unknown", not excluded.
5. S-5: Given a community with flights on Tuesday and Friday and a five-day grounding starting Monday (Monday to Friday counts as five days inclusive), then two missed flights are reported.
6. S-6: Given a transfer mode with no entered lead time, then the ETA shows "unverified".
7. S-7: Given a part marked not serviceable, then it never appears.

**Shared**

1. X-1: Given edits made offline, when the connection returns, then all edits appear after sync and any conflict keeps both versions in the audit log.
2. X-2: Given an AI call times out, then the app keeps working and shows the manual entry path.
3. X-3: Given an AI answer that fails the schema, then nothing is saved and the error is logged.
4. X-4: Given pilot names, then they are replaced by ids before any AI call.
5. X-5: Given the same seed, then the synthetic data generator produces identical data.

## AI interface contracts

| Step | Task | Input | Output | Model tier | If it fails |
| --- | --- | --- | --- | --- | --- |
| P1 | Parse a messy donor list into lots | Pasted text or spreadsheet rows | JSON array of lots, each with the source line and a confidence | Cheap | Manual entry form |
| P2 | Draft a cover letter and checklist | Trip, rule card, matched lots | Draft text citing the rule card id | Stronger | Show the blank template |
| P3 | Explain readiness gaps | Computed readiness JSON | Plain-language summary of gaps only | Stronger | Show the computed list |
| S1 | Parse a parts email or inventory list | Pasted text | JSON array of parts with the source line and a confidence | Cheap | Manual entry form |
| S2 | Draft a message asking a base or community | Disruption and chosen candidate | Draft text | Stronger | Show the blank template |
| S3 | Explain the disruption plan | Computed candidates JSON | Plain-language summary of the candidates | Stronger | Show the computed list |

**Rules for every step**

1. Output must validate against a schema or it is discarded.
2. Unknown values are null, never guessed.
3. The model never decides eligibility, airworthiness, medical suitability or legal status. Code does that.
4. The model states a regulation only if it appears in a rule card, and cites the card id.
5. Every draft shows "Draft, human review required" and is not final until a person marks it reviewed.
6. Names are replaced by ids before the call, and every call is logged.

Example output shape for step P1:

```json
{"lots": [{"generic_name": "amoxicillin", "strength": "500 mg", "form": "capsule", "quantity": 1200, "lot_number": null, "expiry": "2027-06-30", "source_line": "Amoxicillin 500mg caps x1200 exp 6/2027", "confidence": 0.9}]}
```

Each step gets 10–20 recorded golden examples. A change that breaks them fails the tests.

## Assumptions and open questions

- **Stack:** the storage and sync choice (local-only, or cloud sync with a service such as Supabase) is a proposal, not a decision.
- **Shelf-life rule:** the 12-month default and any per-category lowering need a pharmacist's review.
- **Rule cards:** only Honduras has a note. The other country cards are unwritten and unverified.
- **Readiness weights:** the 70/30 split and priority weights are guesses to adjust after a reviewer sees the meter.
- **Lead times and ratings:** SpareWing's transfer times, ratings and currency rules are placeholders until a program supplies real ones.
- **Reviewers:** none is confirmed for either product yet. The Nov 7 rule depends on that.
- **Limits of the tests:** they check that the code follows the rules as written, not that the rules are legally or medically correct.
- **Names:** Prepped and SpareWing have had only light trademark screening.
- **Lovable:** whether its generated code is clean enough to keep inside the repo is untested.

## Shared components and decision status

**Decision status (Nov 7):** no pharmacist or mechanic has reviewed either product, so no reviewer confirmation exists. The build proceeds in parallel, and the choice of which product to submit is made later, after both are working, with the shared core optimized to carry over to other projects.

The two products share most of their plumbing:

| Component | Prepped | SpareWing | Other uses |
| --- | --- | --- | --- |
| Rules engine with sourced rule files | Shelf-life rules, destination cards | Candidate rules | Any "is this allowed or eligible" check |
| Three-state results | Eligible, blocked, needs review | Candidate, excluded, unknown | Anywhere missing data must not silently pass or fail |
| Messy-text parser with schema, confidence and manual fallback | Donor lists (P1) | Parts emails and lists (S1) | Pantry or benevolence inventories, volunteer rosters |
| Draft with human sign-off and audit log | Cover letters and checklists | Messages to bases | Any church-facing letter or form |
| Offline-first storage and sync | Brigade use abroad | Remote bases | Any low-connectivity ministry tool |
| Seeded synthetic data and golden tests | Lots and trips | Fleets and disruptions | Testing any future build |
| Name-to-id redaction before AI calls | Donor and team data | Pilot data | Any product holding personal data |

Both products match a supply to a need under constraints and time windows, so a small generic core of supply, demand, rules, candidates and impact is plausible. Prepped matches quantities against targets, while SpareWing looks for single substitutes, so the match is partial. Rule contents, sign-off roles and screens stay product-specific.

**A caution:** don't build a general engine before the two products work. Build both, then pull out the parts that turned out identical. Keep the shared core to the few types listed above.

**Future candidate to revisit after submission:** food pantry stock sharing between churches. It reuses the same parts: expiry-aware matching, the messy-list parser, offline storage, and draft messages with human review.
