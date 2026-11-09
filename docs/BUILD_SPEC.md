# Build spec for Claude Code

Version: 0.5 · Status: Draft

Exported from the "Build spec" tab of the specs doc (https://claude.ai/artifact/KidYyKqH3HUeydraCFK4Vg). If this file and the doc disagree, this file governs the build. Update it here first.

Both products are built in parallel on one shared foundation, in a hybrid of Lovable for screens and Claude Code for rules, data and tests, using synthetic data only.

## Traceability

Every rule, decision, AI step, acceptance test and open question in this file has a permanent ID, so that a review comment, a test and a code change can all point at the same item.

| Prefix | Item | Defined in |
| --- | --- | --- |
| `H-n` | Hackathon submission requirement | Hackathon submission requirements |
| `F-n` | Shared foundation decision | Shared foundation |
| `PE-n` | Prepped eligibility rule | Prepped |
| `PR-n` | Prepped readiness rule | Prepped |
| `SC-n` | SpareWing candidate rule | SpareWing |
| `SI-n` | SpareWing coverage impact rule | SpareWing |
| `P-n`, `S-n`, `X-n` | Acceptance test (Prepped, SpareWing, shared) | Acceptance tests |
| `AI-P1` to `AI-S3` | AI step contract | AI interface contracts |
| `AR-n` | Rule for every AI step | AI interface contracts |
| `Q-n` | Open question | Assumptions and open questions |

How the IDs are used:

1. An item is defined once, where its ID is written in **bold**. Everywhere else the ID is a plain reference.
2. IDs are never renumbered or reused. A retired item keeps its ID and is marked "Retired" with the reason.
3. Every acceptance test says what it traces to, for example `(traces to PE-1, PE-2)`.
4. Every test names the IDs it verifies in square brackets at the start of its title, for example `it('[P-1] Given a lot expiring ...')`.
5. `pnpm check:trace` fails if an ID is defined twice, a reference or test tag points at an ID that does not exist, an acceptance test has no trace or no test, or `docs/TRACEABILITY.md` is out of date. `pnpm trace:update` regenerates that matrix.
6. `pnpm check:trace --strict` is the submission gate. It also fails while any acceptance test is a placeholder, any rule or AI contract is untested, any open question is open, or any submission requirement (H) is not ticked with its evidence in `docs/SUBMISSION.md`.
7. Every change to this file bumps the version and adds a row to the revision history at the end.

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

## Hackathon submission requirements

From the AI for Church Hackathon 2026 rules (https://aiforchurch.com/hackathon#rules), as supplied by the owner on 2026-11-09. Each requirement is ticked, with its evidence, in `docs/SUBMISSION.md`.

- **H-1** **Deadline and build window.** The build window is October 30 to November 27, 2026, 11:59 PM ET, and the submission is complete before it closes; submissions lock automatically. Judges evaluate only work done in the window. This is an entirely new standalone project, and its git history dates every change.
- **H-2** **Demo video.** 5 minutes or less, hosted on YouTube, Vimeo or Loom.
- **H-3** **AI made it and AI is in it.** The project is built with AI tools (Claude Code, Lovable) and features AI in what it does. The demo shows the AI steps working, not only their manual fallback, and shows a person reviewing each draft (AR-5).
- **H-4** **Honest, kind and safe.** The description and demo claim only what the tests show: placeholder rule values are labelled, the lack of a pharmacist or mechanic review is stated (Q-2, Q-6), and nothing is called approved. The project is not harmful, deceptive or manipulative, and reflects care for people and respect for Scripture.
- **H-5** **Sample data only.** The demo, video, screenshots and live demo use synthetic data only, with no real personal information of church members, congregants, donors or pilots.
- **H-6** **Submission contents.** Project name, written description, track, demo video link, and a live demo link, which the owner wants (Q-21, Q-18). The repository link is optional (Q-21). Licences and terms of the open-source code and AI tools used are followed.
- **H-7** **One project, Open Track.** One project in one track, the Open Track. The description and demo address its four criteria: a clear ministry problem and who it serves; original thinking and fresh approaches; responsible and faithful use of AI; a working demo that shows real potential. Prepped fits the track's "missions and global church tools" idea.

## Shared foundation

These are proposals to confirm, not facts. Each row can change if the build shows a problem.

| ID | Area | Proposed decision | Why |
| --- | --- | --- | --- |
| **F-1** | Language | TypeScript throughout | One language for rules, tests and screens |
| **F-2** | Layout | `packages/core` (pure rules), `packages/ai` (model wrapper), `packages/synth` (seed data), `packages/store` (offline storage and sync, proposed in v0.3), `apps/prepped`, `apps/sparewing` | Rules stay testable without screens |
| **F-3** | Screens | Lovable generates the UI and exports to the repo; Claude Code owns everything outside `apps/*/ui` | Fast demo, with control of the logic |
| **F-4** | Rules | JSON files in `/rules`, loaded by core | A pharmacist or mechanic can read and correct them |
| **F-5** | Dates | Date-only ISO strings, compared in UTC | Avoids time-zone bugs in shelf-life math |
| **F-6** | Storage | Local-first in the browser (IndexedDB), optional cloud sync | Works with spotty internet |
| **F-7** | Offline | Installable web app that queues changes and syncs later | Matches MARC's connectivity |
| **F-8** | AI wrapper | One typed function per task, JSON validated against a schema, one retry, then a manual fallback | A bad or missing AI answer never blocks work |
| **F-9** | Model tiers | Cheap model for parsing, stronger model for drafts and explanations, set by config | Swappable, and cost stays low |
| **F-10** | Tests | Vitest unit tests, plus golden-file tests for AI steps run on recorded outputs | Repeatable without calling a model |
| **F-11** | Audit | Log every AI call and every human sign-off | Supports the responsible-AI score |
| **F-12** | Synthetic data | Seeded random generator, same seed gives the same data | Reproducible demo and tests |

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

- **PE-1** Days remaining at arrival = expiry date minus trip arrival date.
- **PE-2** Default minimum is 12 months remaining at arrival, taken from WHO guidance. A rule can lower it for a direct donation, set per item category in `/rules/shelf-life.json`.
- **PE-3** Controlled substances are always blocked.
- **PE-4** Cold-chain items are always blocked in this build, whatever their expiry, so they stay visible with a reason instead of disappearing. Cold-chain donations are expected to be rare, and leaving them out keeps the build simple (Q-10, closed). Earlier wording: "blocked unless the trip is marked able to receive them".
- **PE-5** A lot with no expiry date is "needs review" and does not count toward readiness.

**Readiness meter:**

- **PR-1** Need coverage counts 70% and document completion 30%. Coverage per item is eligible quantity over target, capped at 100%, weighted by priority. The 70/30 split is an assumption to adjust after reviewer feedback.
- **PR-2** Any blocking issue, such as a missing import permit, caps the meter at "Not ready".

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

- **SC-1** A part is a candidate only if it has the same part number or a listed alternate that the program entered. The tool never decides two parts are interchangeable.
- **SC-2** Parts marked not serviceable never appear.
- **SC-3** A pilot is a candidate only if the entered ratings and currency dates meet the aircraft's requirement and availability is known.
- **SC-4** Missing data shows as "unknown", never as a silent exclusion or a silent pass.
- **SC-5** Every candidate carries the flag "requires sign-off by a licensed mechanic or the operator". The tool never says approved.
- **SC-6** If no candidates exist, the result says so and shows the local order lead time, if one was entered.

**Coverage impact:**

- **SI-1** Missed community flights = flights scheduled between the disruption start and expected end for communities served by the grounded aircraft, minus flights another aircraft or pilot can cover.

## Acceptance tests

Each case becomes an automated test. The numbers below are worked so the expected result is exact.

**Prepped**

- **P-1** (traces to PE-1, PE-2, F-5): Given a lot expiring 2027-03-01 and a trip arriving 2026-12-01, when eligibility runs with the 12-month rule, then the lot is blocked with the reason "90 days remaining, 12 months required".
- **P-2** (traces to PE-1, PE-2, F-5): Given a lot expiring 2028-01-15 and the same trip, then it is eligible with 410 days remaining.
- **P-3** (traces to PE-3): Given a lot marked controlled, then it is blocked whatever its expiry.
- **P-4** (traces to PE-5, PR-1): Given a lot with no expiry date, then it is "needs review" and excluded from readiness.
- **P-5** (traces to PR-2, AI-P2): Given a destination card that requires an import permit and no permit marked obtained, then readiness shows "Not ready" and the document draft lists the missing permit.
- **P-6** (traces to PR-1): Given a target of 200 courses and 150 eligible, then item coverage is 75%.
- **P-7** (traces to AI-P1): Given two donor lines with the same lot number and generic name, then they merge into one lot with summed quantity.
- **P-8** (traces to PE-1, AR-3): Given the arrival date moves 30 days later, then eligibility recalculates without calling any AI step.
- **P-9** (traces to PE-4): Given a lot marked cold chain that would otherwise be eligible (expiring 2028-01-15, trip arriving 2026-12-01), then it is blocked with the reason "cold-chain items are not handled in this build". Added in v0.4.

**SpareWing**

- **S-1** (traces to SC-1, SC-5): Given a grounded aircraft needing part A, a listed alternate B, and one B at base 2, then B appears as a candidate with source base, transfer mode, ETA and the sign-off flag.
- **S-2** (traces to SC-6): Given no stock and no alternate, then the result says no candidates were found, to ask a human, and shows any entered order lead time.
- **S-3** (traces to SC-3): Given a pilot whose entered currency lapsed, then the pilot is excluded with the reason shown.
- **S-4** (traces to SC-3, SC-4): Given a pilot with no availability data, then the pilot shows as "unknown", not excluded.
- **S-5** (traces to SI-1): Given a community with flights on Tuesday and Friday and a five-day grounding starting Monday (Monday to Friday counts as five days inclusive), then two missed flights are reported.
- **S-6** (traces to SC-4): Given a transfer mode with no entered lead time, then the ETA shows "unverified".
- **S-7** (traces to SC-2): Given a part marked not serviceable, then it never appears.

**Shared**

- **X-1** (traces to F-6, F-7, F-11): Given edits made offline, when the connection returns, then all edits appear after sync and any conflict keeps both versions in the audit log.
- **X-2** (traces to F-8): Given an AI call times out, then the app keeps working and shows the manual entry path.
- **X-3** (traces to AR-1, F-8, F-11): Given an AI answer that fails the schema, then nothing is saved and the error is logged.
- **X-4** (traces to AR-6): Given pilot names, then they are replaced by ids before any AI call.
- **X-5** (traces to F-12): Given the same seed, then the synthetic data generator produces identical data.

## AI interface contracts

| Step | Task | Input | Output | Model tier | If it fails |
| --- | --- | --- | --- | --- | --- |
| **AI-P1** | Parse a messy donor list into lots | Pasted text or spreadsheet rows | JSON array of lots, each with the source line and a confidence | Cheap | Manual entry form |
| **AI-P2** | Draft a cover letter and checklist | Trip, rule card, matched lots | Draft text citing the rule card id | Stronger | Show the blank template |
| **AI-P3** | Explain readiness gaps | Computed readiness JSON | Plain-language summary of gaps only | Stronger | Show the computed list |
| **AI-S1** | Parse a parts email or inventory list | Pasted text | JSON array of parts with the source line and a confidence | Cheap | Manual entry form |
| **AI-S2** | Draft a message asking a base or community | Disruption and chosen candidate | Draft text | Stronger | Show the blank template |
| **AI-S3** | Explain the disruption plan | Computed candidates JSON | Plain-language summary of the candidates | Stronger | Show the computed list |

**Rules for every step**

- **AR-1** Output must validate against a schema or it is discarded.
- **AR-2** Unknown values are null, never guessed.
- **AR-3** The model never decides eligibility, airworthiness, medical suitability or legal status. Code does that.
- **AR-4** The model states a regulation only if it appears in a rule card, and cites the card id.
- **AR-5** Every draft shows "Draft, human review required" and is not final until a person marks it reviewed.
- **AR-6** Names are replaced by ids before the call, and every call is logged.

Example output shape for step AI-P1:

```json
{"lots": [{"generic_name": "amoxicillin", "strength": "500 mg", "form": "capsule", "quantity": 1200, "lot_number": null, "expiry": "2027-06-30", "source_line": "Amoxicillin 500mg caps x1200 exp 6/2027", "confidence": 0.9}]}
```

Each step gets 10–20 recorded golden examples. A change that breaks them fails the tests.

## Assumptions and open questions

Each question is written as `(open)` until it is answered. To close one, record the decision in the items it affects, change `(open)` to `(closed YYYY-MM-DD, decided by <name>)`, add one line with the decision, and bump the version of this file.

- **Q-1** (open) **Stack.** The storage and sync choice (local-only, or cloud sync with a service such as Supabase) is a proposal, not a decision. Affects F-6, F-7, X-1.
- **Q-2** (open) **Shelf-life rule.** The 12-month default and any per-category lowering need a pharmacist's review. Affects PE-2.
- **Q-3** (open) **Rule cards.** Only Honduras has a note. The other country cards are unwritten and unverified. Affects F-4, AR-4.
- **Q-4** (open) **Readiness weights.** The 70/30 split and priority weights are guesses to adjust after a reviewer sees the meter. Affects PR-1.
- **Q-5** (open) **Lead times and ratings.** SpareWing's transfer times, ratings and currency rules are placeholders until a program supplies real ones. Affects SC-3, SC-6.
- **Q-6** (open) **Reviewers.** None is confirmed for either product yet. The Nov 7 rule depends on that.
- **Q-7** (open) **Names.** Prepped and SpareWing have had only light trademark screening.
- **Q-8** (open) **Lovable.** Whether its generated code is clean enough to keep inside the repo is untested. Affects F-3.
- **Limits of the tests:** they check that the code follows the rules as written, not that the rules are legally or medically correct.

### Gaps found in review (added in v0.3)

These gaps block exact tests or leave a rule untestable. Each needs a decision before the stream that owns it can finish.

- **Q-9** (open) **Meaning of "12 months".** Is the minimum counted in calendar months from the arrival date, or as a fixed number of days (for example 365)? Does a lot that reaches exactly the minimum pass? P-1 and P-2 pass either way, but lots near the boundary do not. No acceptance test covers the per-category lowering. Affects PE-2, P-1, P-2. Owner: pharmacist, with Q-2.
- **Q-10** (closed 2026-11-09, decided by the owner) **Cold-chain capability.** The Trip entity had no field saying whether a trip can receive cold-chain items. Decision: trips could choose to carry cold-chain items, but such donations seem unlikely, so for simplicity this build excludes cold-chain items. PE-4 now blocks every cold-chain lot, no Trip field is added, and P-9 tests it. Affects PE-4, P-9.
- **Q-11** (open) **Merging donor lines.** The merge rule exists only in P-7. Do lines merge when the lot number and generic name match but strength, form, expiry or donor differ? Does the merge run in core (deterministic) or in AI-P1? CLAUDE.md rule 2 points to core. Affects P-7, AI-P1.
- **Q-12** (open) **Missing documents in the draft.** P-5 expects the document draft to list the missing permit, but drafts come from AI-P2, which tests must not call and which can fail. Proposal: core computes the list of missing documents, and both the AI draft and the blank template include it. Affects P-5, PR-2, AI-P2.
- **Q-13** (open) **Readiness levels.** Only "Not ready" is named. What are the other levels and the thresholds between them, and which documents count toward document completion? Affects PR-1, PR-2.
- **Q-14** (open) **Aircraft rating requirement.** SC-3 checks pilots against "the aircraft's requirement", but the Aircraft entity has no field for required ratings or currency. Proposal: a per-aircraft-type requirement in `/rules`, entered by the program. Affects SC-3, S-3, S-4.
- **Q-15** (open) **Reference date.** ETA and currency need a date to count from: today, the disruption start, or the date the part or pilot is needed. Must currency hold until the expected end of the disruption? Affects SC-3, S-1, S-3.
- **Q-16** (open) **Covering flights.** SI-1 subtracts "flights another aircraft or pilot can cover", but does not say which aircraft and pilots count or at which bases. S-5 has no cover, so it does not test this. Affects SI-1, S-5.
- **Q-17** (open) **Sync conflicts.** X-1 keeps both versions of a conflict in the audit log, but does not say which version the app shows afterwards. Depends on Q-1. Affects X-1, F-6, F-7.
- **Q-18** (open) **Two apps, two Lovable projects.** Each app needs its own Lovable project and its own deploy target. Where is each one hosted, and do CI checks cover the generated screens, given that `apps/*/ui` is never edited by hand? Affects F-3.
- **Q-19** (closed 2026-11-09, decided by the owner) **Hackathon rules on prior work.** The rules are at https://aiforchurch.com/hackathon#rules, which is also where the chosen product is submitted. Decision, from the rules the owner supplied: open-source code, libraries, APIs and AI coding tools are allowed within their licences and terms; only work done in the build window (October 30 to November 27, 2026) is judged; entirely new standalone projects are preferred. This build is an entirely new project, so the toolchain, tests and code stay written fresh for it (CLAUDE.md rule 12). The submission requirements are H-1 to H-7. Affects F-1, F-3, H-1.

### Hackathon questions (added in v0.5)

- **Q-20** (closed 2026-11-09, decided by the owner) **Track.** The Open Track, for "creative, ambitious projects that serve the church". Recorded in H-7. Affects H-7.
- **Q-21** (open) **Public repository and live demo link.** Both are optional in the submission. The owner wants a live demo link, which needs a host for the chosen app (Q-18). Still open: where it is hosted, and whether the repository is made public so that judges can open a repository link. Affects H-6, F-3.

### Reminder: close the open questions

Open questions are not to be left for the end. Before each review point, check the list in `docs/TRACEABILITY.md` and:

1. Answer any question that blocks the stream being reviewed, or record why it can wait.
2. Close a question only with a recorded decision, date and decider, as described above.
3. Before the submission build, every question is either closed or accepted as a known limitation in the demo and the video. `pnpm check:trace --strict` fails while any question is open.

## Shared components and decision status

**Decision status (Nov 7):** no pharmacist or mechanic has reviewed either product, so no reviewer confirmation exists. The build proceeds in parallel, and the choice of which product to submit is made later, after both are working, with the shared core optimized to carry over to other projects.

The two products share most of their plumbing:

| Component | Prepped | SpareWing | Other uses |
| --- | --- | --- | --- |
| Rules engine with sourced rule files | Shelf-life rules, destination cards | Candidate rules | Any "is this allowed or eligible" check |
| Three-state results | Eligible, blocked, needs review | Candidate, excluded, unknown | Anywhere missing data must not silently pass or fail |
| Messy-text parser with schema, confidence and manual fallback | Donor lists (AI-P1) | Parts emails and lists (AI-S1) | Pantry or benevolence inventories, volunteer rosters |
| Draft with human sign-off and audit log | Cover letters and checklists | Messages to bases | Any church-facing letter or form |
| Offline-first storage and sync | Brigade use abroad | Remote bases | Any low-connectivity ministry tool |
| Seeded synthetic data and golden tests | Lots and trips | Fleets and disruptions | Testing any future build |
| Name-to-id redaction before AI calls | Donor and team data | Pilot data | Any product holding personal data |

Both products match a supply to a need under constraints and time windows, so a small generic core of supply, demand, rules, candidates and impact is plausible. Prepped matches quantities against targets, while SpareWing looks for single substitutes, so the match is partial. Rule contents, sign-off roles and screens stay product-specific.

**A caution:** don't build a general engine before the two products work. Build both, then pull out the parts that turned out identical. Keep the shared core to the few types listed above.

**Future candidate to revisit after submission:** food pantry stock sharing between churches. It reuses the same parts: expiry-aware matching, the messy-list parser, offline storage, and draft messages with human review.

## Revision history

| Version | Date | Change | By |
| --- | --- | --- | --- |
| 0.1 | 2026-11-07 | First export from the specs doc (commit 5b2e871, was 40092de) | Owner, drafted with Claude |
| 0.2 | 2026-11-07 | Review questions resolved: build status, permit flag, pilot names, S-5 counting (commit 147ad60, was 0e1ba11) | Owner, drafted with Claude |
| 0.3 | 2026-11-09 | Traceability section; permanent IDs for foundation decisions (F), rules (PE, PR, SC, SI, AR), AI steps (renamed P1 to S3 as AI-P1 to AI-S3, to avoid confusion with acceptance tests P-1 to S-7) and open questions (Q-1 to Q-8); trace links on every acceptance test; gap questions Q-9 to Q-18 and the reminder to close them; Q-19 on the hackathon's rules for prior work, with the link to the rules and submission page; `packages/store` proposed in F-2 for offline storage and sync; revision history. No rule wording changed. | Claude, for owner review |
| 0.4 | 2026-11-09 | Q-10 closed by the owner: cold-chain items are excluded from this build. PE-4 reworded to block every cold-chain lot; acceptance test P-9 added. | Owner decision, recorded by Claude |
| 0.5 | 2026-11-09 | Q-19 closed by the owner from the hackathon rules; Q-20 added and closed (Open Track); Q-21 added; hackathon submission requirements H-1 to H-7, ticked in `docs/SUBMISSION.md` and checked by the strict gate. Commit references in this table updated after the 2026-11-09 history rewrite, which replaced the owner's email address in two commits and changed no file. | Owner decisions, recorded by Claude |
