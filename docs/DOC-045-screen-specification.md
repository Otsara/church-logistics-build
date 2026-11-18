---
id: DOC-045
title: Screen specification
version: 0.3
status: Draft
effective_date:
---

# DOC-045 Screen specification

What each screen shows and does, written before any Lovable credit is spent (DOC-100, IT-003). Lovable builds the screens from this document; it never builds rules. Prepped comes first, because it is the default submission (OD-031); SpareWing follows in a later version of this document (owner, 2026-11-18; ADR-046).

Screens trace to the requirements in DOC-020 by their IDs. Screens are named P1, P2 and so on; these are names within this document, not controlled IDs.

## 1. How the screens reach the rules

- **The rules come from one generated file.** A build script bundles `packages/core`, the AI client and the offline store into one file. It commits that file into each Lovable project's GitHub repository, and the screens import it (owner, 2026-11-18; ADR-046).
  - Nobody edits it by hand.
  - CI checks that it matches this repository's code.
- **Screens decide nothing.** Every eligibility, coverage, indicator, checklist and AI check comes from that file (CLAUDE.md rule 2; ARC-101).
  - A screen never computes a status, a quantity, a percentage or a date difference itself.
  - A screen never reads the clock for a rule: the date of the check is a field the user can see and change (SYS-116).
- **Screens never word a decision their own way.** They show the labels and reasons exactly as core returns them, and never rephrase them.

## 2. Rules for every screen

1. **Never "approved".** No screen, button, message or export uses "approved" (or "airworthy", "cleared" and the rest of the list in `claims.ts`) for a part, pilot, medicine or document (SYS-010, SYS-309). A person **signs off**, and the screen says "Signed off by [name] on [date]".
2. **Suggestions look like suggestions.** Anything the app proposes and a person has not yet signed off is shown as a suggestion (SYS-010, UN-003).
3. **Drafts are labelled.** An AI draft shows "Draft, human review required" until a person marks it reviewed. Any edit brings the label back (SYS-005, ADR-040).
4. **AI never blocks work** (SYS-009).
   - Every AI action has a manual way to do the same thing.
   - When the AI step fails, times out or is refused, the screen says so in plain words and opens the manual form or the computed list.
   - With no connection, AI actions are disabled, with "Needs a connection: enter by hand".
5. **Works offline** (SYS-007, ARC-006, ARC-007).
   - Every screen except the AI actions works with no connection.
   - A small status line shows "Offline: changes are kept and will sync", or "Synced", with the time.
   - A record in conflict shows "Conflict: check" and is not counted until a person chooses a version (OD-017).
6. **Names stay on the device.** Patient and person names are never sent to the AI (SYS-006). Screens show names; the AI gets ids.
7. **Every sign-off and every AI call goes in the audit log** (SYS-008). The log is viewable on P11.
8. **Demo mode** (owner, 2026-11-18; ADR-046).
   - The app opens on synthetic data without sign-in, with a banner: "Demo: synthetic data only. Not for real use."
   - The AI actions need sign-in to an account the owner creates. In demo mode they show "Sign in to use AI help; or enter by hand".
   - No shared password is published.
9. **Devices and access** (OD-035).
   - One responsive layout, phone first, also tablet and laptop.
   - WCAG 2.2 level AA. In particular:
     - status is never shown by colour alone: Go, No go, Eligible, Blocked and the rest always carry their words;
     - touch targets are at least 24 by 24 CSS pixels;
     - every form field has a visible label;
     - errors are described in text.
10. **Language.** English (OD-030).
11. **Placeholder and synthetic rules say so.** Wherever a result depends on a synthetic rule card, the card's label "Synthetic example for the demo: not a real import rule" is shown with it (SYS-120).

## 3. Look and feel

### 3.1 Scope stays as settled

The owner's mockups (the Prepped kit manager and the SpareWing service calendar, claude.ai design canvases of 2026-11-17) and the owner's build prompts guide **look and feel only**. They add no feature, and neither app exceeds the scope and rules already settled (owner, 2026-11-18; ADR-047). In particular, Prepped has none of the following in this build:

- kits;
- PAR levels or restock lists;
- recall notices;
- barcode scanning or item-by-item kit checks;
- an "expiring soon" window;
- a "use first" list;
- a dispatch step;
- reports.

Cold-chain items stay blocked and shown with their reason (SYS-104). SpareWing stays disruption response (parts, pilots, missed flights, a ranked plan). It has no maintenance-due or inspection tracking (SYS-309).

### 3.2 Design requirements (owner, 2026-11-18; non-negotiable)

For both apps:

- **NHS design principles and component patterns:** clear hierarchy; inclusive; high contrast; sentence-case labels; plain-language status and next-action messages.
- **FAA and NASA display human factors:**
  - luminance contrast of at least 3:1, ideally 7:1;
  - colour never the only cue;
  - no pure blue for text or fine detail;
  - large touch targets;
  - a calm visual hierarchy for safety-critical information;
  - legible in varied lighting, and status coding that still works in greyscale.
- **A professional medical and operational utility look,** equal to or better than commercial dashboards:
  - clean snapshot cards and scannable lists;
  - prominent primary actions, with subtle progressive disclosure;
  - a muted sage and neutral palette, good whitespace, no clutter.
- **Fully responsive and touch-optimised:** phone in the field, tablet at the packing station, desktop for planning.
- **Strong offline indicators, local-first editing and transparent sync.**

Where these and WCAG 2.2 AA (OD-035) differ, the stricter applies:

- normal text at least 4.5:1, ideally 7:1;
- large text, icons and status shapes at least 3:1.

### 3.3 Sources the owner named

Considered in designing the screens, not copied:

- KitCheck dashboard (help article);
- Bluesight, on RFID and medication expiry management;
- NHS design system components;
- NHS A to Z of health writing;
- FAA Human Factors Criteria for Displays (2007);
- NASA colour usage guidelines (standards bibliography);
- Traxxall on Capterra;
- Veryon Tracking (formerly CAMP and Traxxall);
- DHIS2 progressive web app deep dive;
- CommCare offline data collection.

No other company's proprietary design is recreated.

### 3.4 Palette, type and status shapes

These are taken from the owner's mockups for their look. Contrast was checked on 2026-11-18 (WCAG formula):

| Use | Colour | Contrast |
|---|---|---|
| Page background | #F1F3EE | — |
| Card background | #FFFFFF | — |
| Text | #1B2A24 | 15.0:1 on cards, 13.4:1 on page |
| Secondary text | #4C5A53 | 7.3:1 on cards, 6.5:1 on page |
| Primary (header, main buttons) | #2F4A3C | white text 9.7:1 |
| Stop: blocked, discard, No go | #9B1C1C | 8.2:1 as text; white on it 8.2:1 |
| Attention: short, needs review | #7A4B00 | 7.4:1 |
| Good: eligible, covered, Go, signed off | #1E5B3A | 8.0:1 |
| Table header row | #E3EAE2 | text 12.2:1 |
| Control borders | #5B6B62 | 5.6:1 |
| Dividers (decorative only) | #C6CFC6 | 1.6:1, never used to convey information |

**Type:** Public Sans, with tabular figures for every number and date.

**Status shapes:** every status carries a shape and its words, so it reads in greyscale.

| Shape | Statuses |
|---|---|
| Filled square | Blocked, "Discard: expired", No go |
| Diamond | Short, and every attention message |
| Dashed circle | Needs review, "Conflict: check", not yet signed off, offline |
| Outlined circle | Eligible, covered, Go, signed off, synced |

The words always come from core.

### 3.5 Patterns used

- **Snapshot cards** at the top of P8 and P5, each with a count and the next action in plain words, for example "2 floor items short. Review alternatives."
- **Lists with a "What to do" column.**
- **One primary action per view**, for example "Review" or "Sign off".
- **An offline and sync banner,** for example "Offline. Changes are saved on this device and will sync when you reconnect."
- **A conflict card with two plain choices.**
- **A bottom tab bar on phones.**

## 4. Who uses Prepped

From IU-103, with the decisions that name who may do what:

| Person | May do |
|---|---|
| Trip coordinator | Create trips; enter donations and confirm donor lines; prepare drafts and mark documents prepared. |
| Lead clinician (a pharmacist or clinician) | Everything the coordinator may do. Also choose the floor list and targets (SYS-110); accept exchanges (SYS-115; only the clinician, OD-048); choose alternatives (SYS-108); add supplements (SYS-114); mark documents reviewed (SYS-112); sign off the packing list (SYS-010). |
| Team leader | Mark documents reviewed (SYS-112). Decides with the lead clinician whether the team deploys; the app only shows an indicator (ADR-009). |
| Any team member | Mark an AI draft reviewed (ADR-040). |

In demo mode, a selector at the top reads "Acting as: [synthetic person, role]". It lets a viewer act as each synthetic person, and the audit log records that person (owner, 2026-11-18; OD-064).

## 5. Prepped screens

### P1 Trips

- **Purpose:** the list of trips, and the starting point.
- **Shows:** each trip's destination, arrival date and indicator ("Go" or "No go", with its words), and when it last synced.
- **Actions:** open a trip; create a trip (P2).
- **Traces to:** UN-103.

### P2 Trip details

- **Shows and edits:**
  - **Destination:** chosen from the rule cards. Each is shown with its label when synthetic.
  - **Arrival date.**
  - **Date of the check:** today by default and changeable, shown so everyone knows what "today" means for discard (SYS-116).
- **Rules:** changing the arrival date or the date of the check recalculates everything (TC-108).
- **Not shown in this build:** the estimate from anticipated caseload (SYS-111). Its method is TBD (OD-038), so the screen offers no estimate.
- **Traces to:** SYS-101, SYS-116, SYS-120.

### P3 Floor list

- **Who edits:** the lead clinician only. Others see it read-only.
- **Shows:** each floor item with its target quantity and priority (1, 2 or 3; 1 is most important).
- **Picker:** search the catalogue by generic name.
  - A controlled medicine shows the core label "Controlled: cannot be packed in this build", with its basis (SYS-118).
  - Out-of-scope routes and cold-chain products show their core reasons.
- **Rules:**
  - A floor item with no target shows "needs review".
  - A target of 0 asks the lead clinician to confirm it (SYS-110).
  - The app never chooses an item or a target (IU-102).
- **Traces to:** SYS-110, SYS-118.

### P4 Donations and donor lines

- **Shows:** the trip's donations, each with its donor and lines.
- **Add a donation by hand:** one form per line, with generic name, strength, dosage form, quantity, lot number, expiry as printed, and manufacturer.
- **Add a donation by pasting a list (AI, AIC-101):**
  - The person pastes text. The AI reads it, and each line comes back for review.
  - Each line shows:
    - the original line;
    - each value read, or empty with the reason;
    - "needs review" with every reason;
    - the confidence, shown but deciding nothing.
  - The person confirms, corrects or discards each line. Nothing becomes a lot until confirmed (SYS-119, ADR-035).
  - Set-aside lines say why and go to manual entry.
- **Merging:** confirmed lines merge into lots by core (`mergeDonorLines`, SYS-117). Lines that don't merge show the core flags, such as "Same lot number, different details: check".
- **Traces to:** SYS-117, SYS-119, SYS-009, AIC-101.

### P5 Lots

- **Shows:** every lot, grouped by status: Eligible, Needs review, Blocked, and a separate "Discard: expired" list (SYS-116).
- **Each lot shows:**
  - generic name, strength and form;
  - lot number, expiry as printed and as read;
  - days remaining at arrival (SYS-101);
  - donor and manufacturer;
  - **every** reason core gives.
- **Controlled status shows its basis and source** (SYS-103).
- **Cold-chain and out-of-scope lots stay visible with their reason** (SYS-104, SYS-109).
- **Traces to:** SYS-101 to SYS-105, SYS-109, SYS-116.

### P6 Floor coverage

- **For each floor item:**
  - the target and the amount covered;
  - the shortage, if any;
  - the lots that combine to meet it, each with donor and manufacturer (SYS-113);
  - "needs review" with the reason, where core gives one.
- **Exchanges** (same medicine, other form or strength; SYS-115):
  - offered when the item is short;
  - the clinician accepts one and enters the share of the target it counts for;
  - the screen never converts doses.
- **Comparable alternatives** (SYS-108):
  - listed for every item, and marked "offered" when the item is short;
  - each carries "Comparable, not equivalent: clinician review required", its class and the class's source;
  - the clinician chooses one and enters the amount it counts for;
  - a product with no class says "No class recorded: no alternatives".
- **A lot that would count toward two items** shows the core problem, and the clinician resolves it (SYS-113).
- **Traces to:** SYS-108, SYS-113, SYS-115.

### P7 Supplements

- **Who edits:** the lead clinician.
- **Shows:** medicines added beyond the floor, each with its eligibility from core.
- **Rule:** shown apart from the floor, with "Does not count toward the floor or the indicator" (SYS-114).
- **Traces to:** SYS-114.

### P8 Readiness

- **Indicator:**
  - "Go" or "No go", large, in words, always with the label "Indicator only: deploying the team is the lead clinician's or team leader's decision" (SYS-112).
  - With no floor items: "No go", with the reason.
- **Meter:** the readiness percentage as a graphic beside the indicator, with its parts, coverage and documents (SYS-106). Coverage counts 70% and documents 30% (owner, 2026-11-18; OD-063).
- **What stands in the way:** every short floor item with the amount short, and every missing document (SYS-107, SYS-112).
- **Explanation (AI, AIC-103):**
  - a button "Explain the gaps";
  - the explanation shows **beside** the computed list, never instead of it;
  - if rejected, the screen says "The explanation did not match the results; here is the list" (TC-010).
- **Traces to:** SYS-106, SYS-107, SYS-112, AIC-103.

### P9 Paperwork

- **Checklist** (SYS-120):
  - the checklists from the trip's rule cards, the WHO card first and then the country's, word for word as core builds them;
  - each document marked "prepared" or "missing";
  - notes and labels shown as core gives them.
- **Documents:**
  - the coordinator marks a document prepared;
  - the lead clinician or team leader marks it reviewed (SYS-112);
  - each mark records who and when.
- **Covering letter (AI, AIC-102):**
  - a button "Draft the covering letter";
  - the draft shows the letter, then the medicine list and the checklists, labelled "Draft, human review required";
  - the person edits it (an edit brings the label back), marks it reviewed, then prints or copies it;
  - if rejected, the blank template opens with the same lists, and the reasons are shown.
- **Traces to:** SYS-004, SYS-005, SYS-112, SYS-120, AIC-102.

### P10 Packing list and sign-off

- **Shows:**
  - the packing list core assembles: eligible lots for the floor items, accepted exchanges and chosen alternatives, and supplements;
  - for each lot, its quantity, lot number, expiry and donor;
  - every open problem.
- **Sign-off:**
  - only the lead clinician (a pharmacist or clinician) can sign off;
  - the screen shows "Signed off by [name] on [date]", never "approved";
  - the packing list is never final without that sign-off (SYS-010, IU-102);
  - a change after sign-off clears the sign-off, and the change is recorded.
- **Traces to:** SYS-010.
- **Core:** `signOffPackingList` and `packingListStatus` (SYS-010). The status message is shown as core gives it, for example "Suggestion: the lead clinician has not signed off this packing list".

### P11 Audit log

- **Shows:** every AI call and every sign-off, review mark, edit and decision, with time, person, action, before and after (SYS-008).
- **Rules:** read-only; filter by trip and by person.
- **Traces to:** SYS-008.

### P12 Sign-in and settings

- **Sign-in:** needed only for sync and the AI actions (ARC-006; ADR-046).
- **Shows:** who is signed in and their role, the sync status, and a "Sign out" action.
- **Demo mode:** says so, and offers sign-in.
- **Traces to:** ARC-006, SEC-008.

## 6. Lovable plan for Prepped

From the credit plan in DOC-100 (IT-003): 50 credits for Prepped, with no Max mode. Every message to Lovable is sent only with the owner's go-ahead.

1. **One plan-mode message**, to agree the approach, with this document attached. It opens with the owner's prompt. That prompt's design requirements are used word for word (section 3.2). Its description of the app is replaced by this document's scope:
   - **The app:** a responsive web app (desktop, tablet, phone) for pharmacists, clinicians and trip coordinators preparing a medical mission team's pharmacy from donated medicines, as screens P1 to P12 of this document.
   - **Primary actions:** "Review" and "Sign off". There is no dispatch step (section 3.1).
2. **The cost of the first build message is checked** before more is spent.
3. **A few batched build messages:** shell and P1–P3; then P4–P7; then P8–P12.
4. **Lovable builds screens only,** importing the generated rules file. It writes no business logic.

## 7. Decisions owed before the build

Decided on 2026-11-18:

- OD-063: the meter keeps 70/30.
- OD-064: demo mode has an "Acting as" selector.
- Section 3.1: the mockups set look and feel, not scope.

Built on 2026-11-18: the packing list sign-off in core (`sign-off.ts`). It refuses anyone but the lead clinician, a lot listed twice and an empty list, records who and when, and shows any later change.

## Revision history

| Version | Date | Change | By |
|---|---|---|---|
| 0.1 | 2026-11-18 | First draft: how the screens reach the rules, rules for every screen, Prepped users and screens P1 to P12, the Lovable plan, and the decisions owed (owner, 2026-11-18; ADR-046). | Claude, for owner review |
| 0.2 | 2026-11-18 | New section 3, look and feel: scope stays as settled, the owner's design requirements and sources, palette with checked contrast, status shapes and patterns. OD-063 (70/30) and OD-064 (a) decided. The Lovable plan uses the owner's prompt with this document's scope (owner, 2026-11-18; ADR-047). | Claude, for owner review |
| 0.3 | 2026-11-18 | P10: the packing list sign-off is built in core (SYS-010). | Claude, for owner review |
