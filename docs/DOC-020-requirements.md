---
id: DOC-020
title: User needs and system requirements
version: 0.23
status: Draft
effective_date:
---

# DOC-020 User needs and system requirements

User needs (UN) say what people need, in their terms. System requirements (SYS) say what the software must do, testably. Each SYS traces to the user need it serves and, where it is a risk control, to the RC in DOC-030. Requirements marked `Safety-critical: yes` are implemented and verified to ADR-006. Requirements carried over from `docs/BUILD_SPEC.md` keep their wording and list their old ID under `Formerly:` (ADR-001).

## 1. User needs

### UN-001 Work without a connection
- Product: Shared
- Traces to: IU-003

Users can keep working where the internet is poor or absent, and nothing they enter is lost.

### UN-002 Keep personal information private
- Product: Shared
- Traces to: IU-001

Names and personal details never leave the user's control, including to AI services.

### UN-003 Know what is a suggestion and who decides
- Product: Shared
- Traces to: IU-001, IU-103, IU-303

Users can always tell a suggestion or draft from a decision, and the person with authority confirms every decision.

### UN-004 A record of suggestions and decisions
- Product: Shared
- Traces to: IU-001

Teams can see afterwards what the software suggested and who decided what.

### UN-005 Enter messy information quickly and correct it
- Product: Shared
- Traces to: IU-101, IU-301

Users can paste messy lists and emails, check what the software read, and fix mistakes, with a manual path when automated reading fails.

### UN-101 Know which donated lots will last the trip
- Product: Prepped
- Traces to: IU-101

The coordinator and clinician can see which lots will still have enough shelf life when the team arrives.

### UN-102 Keep unsuitable items out of the mission pharmacy
- Product: Prepped
- Traces to: IU-101

Controlled substances, cold-chain items and lots with unknown expiry are never packed by mistake.

### UN-103 See how ready the trip is
- Product: Prepped
- Traces to: IU-101

The team can see how well needs are covered and which documents are missing.

### UN-104 Prepare import paperwork
- Product: Prepped
- Traces to: IU-101

The coordinator gets draft paperwork based on the destination's verified requirements.

### UN-105 Consider comparable alternatives
- Product: Prepped
- Traces to: IU-101, IU-103

When the proposed collection is short or unsuitable, the clinician can browse comparable medicines that are available in the same class and choose among them (owner, 2026-11-10).

### UN-106 Know whether donations can meet the mission's floor
- Product: Prepped
- Traces to: IU-101

The lead clinician and team leader can see whether the donations, combined, meet the mission's minimum floor list and the destination's paperwork, and exactly what is short (owner, 2026-11-10).

### UN-107 Tailor the pharmacy beyond the floor
- Product: Prepped
- Traces to: IU-101, IU-103

The lead clinician can add supplemental medicines to suit their preferences (owner, 2026-11-10).

### UN-301 Find parts that can return an aircraft to service
- Product: SpareWing
- Traces to: IU-301

The mechanic can see which entered parts could resolve a grounding, where they are, and how long they take to arrive.

### UN-302 Find pilots who can cover
- Product: SpareWing
- Traces to: IU-301

The flight base director can see which pilots meet the entered requirements and are available.

### UN-303 Know which communities are affected
- Product: SpareWing
- Traces to: IU-301

The director can see which community flights a disruption will cause to be missed.

### UN-304 Ask bases and communities quickly
- Product: SpareWing
- Traces to: IU-301

The director gets draft messages to bases and communities to send after review.

### UN-305 A proposed plan to review
- Product: SpareWing
- Traces to: IU-301, IU-303

The director, mechanic and pilot get the best plan the software can find, to review and verify (owner, 2026-11-10).

## 2. Requirements for both products

### SYS-001 AI output validated against a schema
- Product: Shared
- Traces to: UN-005, RC-002
- Safety-critical: yes
- Formerly: AR-1

Output must validate against a schema or it is discarded.

### SYS-002 Unknown values are null
- Product: Shared
- Traces to: UN-005, RC-002
- Safety-critical: yes
- Formerly: AR-2

Unknown values are null, never guessed.

### SYS-003 The model never decides
- Product: Shared
- Traces to: UN-003, RC-001, RC-002
- Safety-critical: yes
- Formerly: AR-3

The model never decides eligibility, airworthiness, medical suitability or legal status. Code does that.

### SYS-004 Regulations only from rule cards
- Product: Shared
- Traces to: UN-104, RC-003
- Safety-critical: yes
- Formerly: AR-4

The model states a regulation only if it appears in a rule card, and cites the card id.

### SYS-005 Drafts marked and reviewed
- Product: Shared
- Traces to: UN-003, RC-001
- Safety-critical: yes
- Formerly: AR-5

Every draft shows "Draft, human review required" and is not final until a person marks it reviewed.

### SYS-006 Names replaced and calls logged
- Product: Shared
- Traces to: UN-002, UN-004, RC-004
- Formerly: AR-6

Names are replaced by ids before the call, and every call is logged.

### SYS-007 Offline work and sync
- Product: Shared
- Traces to: UN-001, RC-005

Edits made offline are kept and appear after sync when the connection returns; any conflict keeps both versions in the audit log. A conflicting record is marked "Conflict: check" and treated as not settled (a lot is not counted, a pilot is not a candidate) until a person chooses a version (owner, 2026-11-12); ADR-012.

### SYS-008 Audit log
- Product: Shared
- Traces to: UN-004, RC-005

Every AI call and every human sign-off is logged with time, actor, action, before and after.

### SYS-009 AI failure never blocks work
- Product: Shared
- Traces to: UN-005, RC-006

When an AI step times out, errors or returns invalid output, the app retries once, then shows the manual entry path or the blank template, and keeps working.

### SYS-010 Sign-off by the person with authority
- Product: Shared
- Traces to: UN-003, RC-001
- Safety-critical: yes

Every packing list, candidate, proposal and draft stays a suggestion until the person with authority for it (IU-103, IU-303) signs it off in the app. No screen, message or export uses the word "approved" for a part, pilot, medicine or document.

## 3. Prepped requirements

### SYS-101 Days remaining at arrival
- Product: Prepped
- Traces to: UN-101, RC-101
- Safety-critical: yes
- Formerly: PE-1

Days remaining at arrival = expiry date minus trip arrival date.

### SYS-102 Minimum shelf life at arrival
- Product: Prepped
- Traces to: UN-101, RC-101
- Safety-critical: yes
- Formerly: PE-2

Default minimum is 12 months remaining at arrival, taken from WHO guidance, counted as 365 days from the arrival date; a lot whose expiry is exactly 365 days after arrival passes (owner, 2026-11-12); ADR-013. An expiry printed as month and year only is read as the last day of that month (owner, 2026-11-12); OD-043. The minimum is read from `rules/prepped/shelf-life.json`, which cites WHO, Guidelines for medicine donations, revised 2010, Article 6: "at least one year" after arrival (read 2026-11-12). A rule can lower the minimum for a direct donation, set per item category in that file; no category or value is set, and neither of WHO's exceptions applies in this build (owner, 2026-11-13); OD-053, ADR-022. The owner verified the file against its source for the prototype (owner, 2026-11-13); external review is still needed before real-world use (OD-002).

### SYS-103 Controlled substances blocked
- Product: Prepped
- Traces to: UN-102, RC-103
- Safety-critical: yes
- Formerly: PE-3

Controlled substances are always blocked. Controlled status comes from the FDA drug directory: a product with a DEA schedule is controlled; a product without one counts as not controlled in the US, and the screen shows that basis and its source. The pharmacist confirms the destination's controlled-drug rules (owner, 2026-11-12); ADR-014.

### SYS-104 Cold-chain items blocked
- Product: Prepped
- Traces to: UN-102, RC-104
- Safety-critical: yes
- Formerly: PE-4

Cold-chain items are always blocked in this build, whatever their expiry, so they stay visible with a reason instead of disappearing (owner, 2026-11-09; ADR-007). Biologic product types in the FDA drug directory are treated as cold chain whatever the lot says (owner, 2026-11-12); OD-049, ADR-018.

### SYS-105 Unknown expiry needs review
- Product: Prepped
- Traces to: UN-102, RC-102
- Safety-critical: yes
- Formerly: PE-5

A lot with no expiry date is "needs review" and does not count toward readiness. An expiry that cannot be read as a date is treated the same way and is never guessed (owner, 2026-11-13). Every unambiguous label format is read (owner, 2026-11-13; ADR-022): a full date with the year first (2028-03-15, 2028/03/15, 2028.3.15), with a named month (15 MAR 2028, 15MAR2028, MAR 15, 2028), or with the day and month in numbers when only one order makes a real date (15/03/2028, 03/15/2028); a month and year (03/2028, 2028-03, MAR 2028), read as the last day of the month (OD-043); and any of these after a label word such as "EXP" or "Use by". A two-digit year written last means 20YY (owner, 2026-11-13): 15 MAR 28, MAR 28, 03/28 and 27/12/30 are read; the owner accepted that a year-first label (YY-MM-DD) would be misread (HAZ-101). A day and month that could be read either way (04/05/2028, 1.2.28) needs review. Month names are in English only for the MVP (owner, 2026-11-13; OD-030).

### SYS-106 Readiness meter
- Product: Prepped
- Traces to: UN-103, RC-107
- Safety-critical: yes
- Formerly: PR-1

Need coverage counts 70% and document completion 30%. Coverage per item is eligible quantity over target, capped at 100%, weighted by priority. The meter is kept as a graphic beside the Go or No go indicator (SYS-112); the documents to bring the medicines into the destination count 30%, and a 75/25 or 80/20 split is also acceptable if the screen layout favours it (owner, 2026-11-11). Priority 1 is the most important; priorities 1, 2 and 3 weigh 3, 2 and 1 (owner, 2026-11-12); ADR-017. A floor item that needs review counts as 0% covered; with no documents required, the document share counts as complete; the 70/30 split stays until the screens are built, when 75/25 or 80/20 may be chosen (owner, 2026-11-15).

### SYS-107 Blocking issues mean No go
- Product: Prepped
- Traces to: UN-103, UN-104, RC-106
- Safety-critical: yes
- Formerly: PR-2

Any blocking issue, such as a missing import permit, makes the indicator "No go" (SYS-112) and is listed there and in the draft paperwork. The meter shows its percentage as usual. "Not ready" is not used (owner, 2026-11-12); OD-052, ADR-021.

### SYS-108 Comparable alternatives for clinician review
- Product: Prepped
- Traces to: UN-105, RC-105
- Safety-critical: yes

For a need that eligible lots do not cover, Prepped lists other eligible lots in the same therapeutic class for the clinician to consider. Each is labelled "Comparable, not equivalent: clinician review required", shows its class and the source of that class, and is added to the collection only when the clinician chooses it. Prepped never substitutes automatically (owner, 2026-11-10; ADR-003). The class is the established pharmacologic class (EPC) in the FDA drug directory (owner, 2026-11-12); a product without one gets no alternatives, and the screen says so (ADR-014). The same medicine in another form or strength is an exchange (SYS-115), never an alternative. A chosen alternative counts exactly the share of the floor item's target the clinician enters when choosing it, as an exchange does; the item shows that it is covered partly by a comparable alternative the clinician chose. One that is the same medicine, shares no class, or has no amount entered makes the item "needs review"; one whose lot is missing or no longer eligible is not counted, with the reason (owner, 2026-11-15; OD-055, ADR-026). An alternative shares a class with the floor item and brings no class the item lacks, so a combination product that adds another medicine is never offered for a single agent; one chosen anyway makes the item "needs review", naming the extra classes. Alternatives are listed for every floor item, so the clinician can look early, and those of an item that is short or needs review are marked as offered because it is short (owner, 2026-11-15; ADR-028). A chosen alternative entered as covering more than its lot holds is not counted and makes the item "needs review": the floor set by the lead clinician stands until further donations cover it or the lead clinician redefines it. A chosen alternative or accepted exchange whose lot is not eligible is reported as not eligible before any missing amount, since it can never count (owner, 2026-11-15; ADR-029).

### SYS-109 Route and storage scope
- Product: Prepped
- Traces to: UN-102, RC-109
- Safety-critical: yes

A lot is in scope only if its route is oral, sublingual, rectal, topical (skin) or ophthalmic (owner, 2026-11-10), or inhaled, nasal, vaginal or otic (owner, 2026-11-11), and it needs no cold chain. Feeding tube is not a route category: suitability for a feeding tube is the clinician's judgement (owner, 2026-11-12); OD-045. FDA route terms map to these categories through `rules/prepped/route-scope.json`, verified by the owner (owner, 2026-11-12); OD-042. Compressed gases (any dosage form beginning with GAS) are outside scope (OD-051; REV-002), and so is a product whose FDA product type is not recorded, because a biologic could not be recognised (owner, 2026-11-12); REV-001, ADR-020. Injections, infusions and any route not named are blocked with the reason "outside this build's scope".

### SYS-110 Mission floor list set by the lead clinician
- Product: Prepped
- Traces to: UN-106, RC-110
- Safety-critical: yes

The lead clinician chooses each mission's floor list from the essential-medicines catalogue (DAT-102) and enters a target quantity for each item. Prepped never sets a floor item or a target itself (owner, 2026-11-10). A floor item without a target is "needs review" and counts as not covered. A target of 0 asks the lead clinician to confirm it; once confirmed, the item counts as covered, needs no further review, and is left out of the meter (owner, 2026-11-13).

### SYS-111 Estimate from anticipated caseload
- Product: Prepped
- Traces to: UN-106, RC-111
- Safety-critical: yes

From the anticipated caseload the team leader enters, Prepped may offer an estimated quantity for a floor item, labelled as an estimate, for the clinician to accept or change; it is never applied by itself (owner, 2026-11-10). Estimation method and parameters: TBD (OD-038).

### SYS-112 Go or No go indicator
- Product: Prepped
- Traces to: UN-103, UN-106, RC-106, RC-112
- Safety-critical: yes

Prepped shows "Go" only when every floor item's target is covered by eligible stock, combining lots from different donations, and every document the destination's rule card requires is prepared and marked reviewed, by the lead clinician or team leader (owner, 2026-11-13). Otherwise it shows "No go" and lists each short floor item with the amount short, and each missing document. The indicator always carries the label "Indicator only: deploying the team is the lead clinician's or team leader's decision" (owner, 2026-11-10; ADR-009). With no floor items chosen, the indicator shows "No go" with that reason, never "Go" (owner, 2026-11-13). An accepted exchange for an item not on the floor list also means "No go" until it is checked (owner, 2026-11-13; ADR-023).

### SYS-113 Combining donations and showing shortages
- Product: Prepped
- Traces to: UN-106, RC-112
- Safety-critical: yes

For each floor item, Prepped shows which eligible lots, from which donations, combine to meet the target, and the shortage where they do not (owner, 2026-11-10). Lots of the same medicine, formulation and strength combine directly; other formulations and strengths are handled as exchanges (SYS-115) (owner, 2026-11-11). A lot combines toward a floor item when both refer to the same catalogue entry, whoever made it, and only eligible lots count; each lot is listed with its donor and manufacturer (owner, 2026-11-13; OD-054, ADR-024). A lot that would count toward two floor items (the same product listed twice, or a lot accepted as an exchange for one item that is another item's own product) makes both items "needs review", so nothing is counted twice; the clinician resolves it, and Prepped never decides which item gets the stock (owner, 2026-11-13; ADR-023).

### SYS-114 Supplemental medicines
- Product: Prepped
- Traces to: UN-107, RC-113
- Safety-critical: yes

The lead clinician may add supplemental medicines beyond the floor list. Supplements follow the same eligibility rules but never count toward a floor item and never change the Go or No go indicator (owner, 2026-11-10).

### SYS-115 Exchanges of formulation and strength
- Product: Prepped
- Traces to: UN-106, RC-114
- Safety-critical: yes

For a floor item that is short, Prepped offers eligible lots of the same medicine in other formulations (for example liquid suspension, tablet, capsule, dissolvable) or strengths as exchanges (owner, 2026-11-11). An exchange counts toward the floor item only after the clinician accepts it, and then counts exactly the share of the target the clinician enters when accepting it. Prepped never converts doses by itself (owner, 2026-11-11; ADR-011). For example, tablets and an oral suspension of the same medicine may meet a floor item either alone or in portions of both, each counting the share entered for it (owner, 2026-11-12). Who accepts an exchange: the clinician, until OD-048 is decided. An accepted exchange is not counted if its lot is missing or no longer eligible (for example after the arrival date moves), with the reason shown; one that is not the same medicine, is the item's own product, or has no valid amount entered makes the item "needs review", so the entry stays visible until the clinician corrects it (owner, 2026-11-13; ADR-023). An ineligible lot is reported as not eligible before a missing amount (owner, 2026-11-15; ADR-029). An accepted exchange counts the amount entered even when it is more than the lot's count, since a strength exchange can rightly cover more of the target than its lot holds (owner, 2026-11-15; OD-056, ADR-029).

### SYS-116 Expired lots set aside for discard
- Product: Prepped
- Traces to: UN-102, RC-115
- Safety-critical: yes

Lots whose expiry date has passed on the date of the check are listed separately, marked "Discard: expired", and are never eligible (owner, 2026-11-11). The date of the check is an input; rule code never reads the clock.

### SYS-117 One expiry per lot number
- Product: Prepped
- Traces to: UN-101, RC-108
- Safety-critical: yes

Each lot number corresponds to one expiry date (owner, 2026-11-11). Donor lines with the same lot number, medicine and manufacturer but different expiry dates are not merged; they are marked "needs review" until a person corrects them. Lines from different manufacturers are different lots even with the same lot number (owner, 2026-11-13; OD-054). A line without a manufacturer is not treated as the same manufacturer, even where that is likely: it never merges and raises no expiry conflict, and a line sharing its lot number is flagged "Same lot number, different details: check" (owner, 2026-11-13). A line without a lot number or a readable expiry never merges and needs review: the donation's viability is in question until it is clarified with the donor (owner, 2026-11-15). Lines are matched ignoring capitals and surrounding spaces, and every line's lot number is kept as entered, for recalls (owner, 2026-11-15). A lot marked for review when merging stays "needs review" at eligibility, never counted, until a person resolves it (ADR-027).

### SYS-118 Controlled medicines labelled in the floor-list picker
- Product: Prepped
- Traces to: UN-106, RC-103

When the lead clinician picks floor items, a controlled medicine in the catalogue is labelled "Controlled: cannot be packed in this build" with its basis (for example "FDA drug directory: DEA schedule CII"), so a floor item is never chosen without knowing it cannot be met (owner, 2026-11-12); REV-001, ADR-020.

## 4. SpareWing requirements

### SYS-301 Parts by entered part numbers only
- Product: SpareWing
- Traces to: UN-301, RC-301
- Safety-critical: yes
- Formerly: SC-1

A part is a candidate only if it has the same part number or a listed alternate that the program entered. The tool never decides two parts are interchangeable. An alternate counts only when the program lists it as an alternate for the needed part, not the other way round, since interchangeability can run one way only, even where in practice it runs both ways. A listed alternate also carries the note "interchange with … to be confirmed by the pilot, mechanic or flight base director before use" (owner, 2026-11-15; ADR-025). Part numbers are compared ignoring leading and trailing spaces and letter case; every other character, dashes included, must match, since a dash or suffix can mark a different part (owner, 2026-11-15; ADR-030).

### SYS-302 Unserviceable parts never appear
- Product: SpareWing
- Traces to: UN-301, RC-302
- Safety-critical: yes
- Formerly: SC-2

Parts marked not serviceable never appear, and neither do parts with none in stock (owner, 2026-11-15; ADR-025).

### SYS-303 Pilot candidates
- Product: SpareWing
- Traces to: UN-302, RC-303
- Safety-critical: yes
- Formerly: SC-3

A pilot is a candidate only if the entered ratings and currency dates meet the aircraft's requirement and availability is known. The requirement is the aircraft type's rule file in `/rules` plus any extra requirements entered on the individual aircraft. Currency is checked on the date the pilot is needed and must hold until the expected end of the disruption; otherwise the pilot is not a candidate and the reason is shown (owner, 2026-11-12); ADR-015. Entered availability must cover every day from the date needed to the expected end; a known reason to rule a pilot out outweighs data not entered (owner, 2026-11-15; ADR-025). Ratings are compared ignoring leading and trailing spaces and letter case. An aircraft with no required ratings entered, or an expected end before the date needed, makes every pilot "data missing" ("required ratings not entered for this aircraft"; "expected end is before the date needed: check the dates"), never a candidate; a known reason to rule a pilot out still excludes them. Duty time and rest limits are deferred until after the hackathon; for the MVP the person signing off checks them (owner, 2026-11-16; OD-059, ADR-033).

### SYS-304 Missing data is shown, never silent
- Product: SpareWing
- Traces to: UN-301, UN-302, RC-304, RC-306
- Safety-critical: yes
- Formerly: SC-4

Missing data shows as "data missing", naming what was not entered (for example "availability not entered"), never as a silent exclusion or a silent pass; the pilot or part itself is always known (owner, 2026-11-15; ADR-025). A part's ETA is the date of the search plus the entered lead time; with no lead time, a negative one, or no transfer mode entered between the bases, the part still shows, with its ETA "unverified" (owner, 2026-11-15; ADR-025).

### SYS-305 Sign-off flag on every candidate
- Product: SpareWing
- Traces to: UN-305, RC-305
- Safety-critical: yes
- Formerly: SC-5

Every candidate carries the flag "requires sign-off by a licensed mechanic or the operator". The tool never says approved.

### SYS-306 No candidates
- Product: SpareWing
- Traces to: UN-301, RC-304
- Safety-critical: yes
- Formerly: SC-6

If no candidates exist, the result says so and shows the local order lead time, if one was entered. A negative, fractional or missing order lead time reads "no order lead time entered", as transfer lead times do (owner, 2026-11-15; ADR-030).

### SYS-307 Missed community flights
- Product: SpareWing
- Traces to: UN-303, RC-307
- Safety-critical: yes
- Formerly: SI-1

Missed community flights = flights scheduled between the disruption start and expected end for communities served by the grounded aircraft, minus flights another aircraft or pilot can cover. Only aircraft and pilots at bases that the program's rule file lists for that community count, and the candidate rules (SYS-303) still apply (owner, 2026-11-12); ADR-015. A pilot with data missing is shown as possible cover, naming what is missing, but not counted until it is entered; the start and expected end days both count (owner, 2026-11-15; ADR-025). The cover aircraft counts only when entered as available over the disruption; not entered or not available, it is not counted, saying why. An expected end before the start ("expected end is before the start: check the dates") or no flight days entered ("flight schedule not entered") leaves missed flights unknown, shown as data missing, never as zero (owner, 2026-11-16; ADR-032).

### SYS-308 Proposed plan for review
- Product: SpareWing
- Traces to: UN-305, RC-308
- Safety-critical: yes

SpareWing ranks the candidate options and proposes the best plan for the director, mechanic and pilot to review and verify (owner, 2026-11-10). Ranking never removes a candidate from view, and the reasons for the ranking are shown. Options are ranked in strict order, with no weights: fewest missed community flights, then earliest return to service, then fewest transfers between bases; cost is shown but not ranked (owner, 2026-11-12); ADR-015. An unknown return to service ranks after a known one, and options tied on every criterion keep the order entered, saying so (owner, 2026-11-15; ADR-025). Missed flights that are unknown (data missing) rank after every known count, saying so (owner, 2026-11-16; ADR-032).

### SYS-309 Never approves schedules or airworthiness
- Product: SpareWing
- Traces to: UN-305, RC-305
- Safety-critical: yes

SpareWing never approves a schedule change and never states that an aircraft is flightworthy. A proposal becomes a decision only when the flight base director, mechanic or pilot records it (owner, 2026-11-10; ADR-002), identified by name or id in the audit log; anyone else, or an AI step, is refused (owner, 2026-11-15; ADR-025). A decision is refused if its time is not a valid UTC date and time, or its option is not in the ranked list (owner, 2026-11-16; ADR-032).

### SYS-311 Quantity of a part needed
- Product: SpareWing
- Traces to: UN-301, RC-304
- Safety-critical: yes

A part need says how many are needed. A base holding fewer is still listed, since parts from two bases can be combined, and is marked "holds 1 of 2 needed"; a base holding enough is not marked. With no valid quantity entered (a whole number of 1 or more), every candidate says "quantity needed not entered: check the base holds enough" (owner, 2026-11-15; ADR-030).

### SYS-312 Placeholder rules shown as placeholders
- Product: SpareWing
- Traces to: UN-305, RC-309
- Safety-critical: yes

Every SpareWing result that relies on a rule file whose status is "placeholder" shows "Placeholder rules: not for real flight decisions" beside it, so a demo or prototype result is never taken as a real program's rules (owner, 2026-11-16; ADR-034). Rule files are read from their text: a file that names an aircraft type, a community or any field twice is refused, naming each repeat, and aircraft types are matched ignoring leading and trailing spaces and letter case.

### SYS-310 Draft messages to bases and communities
- Product: SpareWing
- Traces to: UN-304, RC-001

SpareWing drafts messages to bases and communities about a disruption and the chosen candidate, for a person to review, edit and send. Each draft is marked as a draft (SYS-005). SpareWing never sends a message itself (owner, 2026-11-12); OD-026.

## Revision history

| Version | Date | Change | By |
| --- | --- | --- | --- |
| 0.1 | 2026-11-10 | First draft. Requirements carried over from BUILD_SPEC v0.5 (AR-1..6, PE-1..5, PR-1..2, SC-1..6, SI-1) with unchanged wording (ADR-001). New: user needs UN-001..005, UN-101..105, UN-301..305; SYS-007..010, SYS-108, SYS-308 to SYS-310 from the owner's answers of 2026-11-10. | Claude, for owner review |
| 0.2 | 2026-11-10 | New UN-106, UN-107 and SYS-109 to SYS-114: route and storage scope, floor list set by the lead clinician, caseload estimate, Go or No go indicator, combining donations, supplements (owner, 2026-11-10; ADR-009). SYS-106 marked for keep-or-retire (OD-004). | Claude, for owner review |
| 0.3 | 2026-11-11 | SYS-106 meter kept (70/30, or 75/25 or 80/20 if the layout favours it); SYS-109 adds inhaled, nasal, vaginal and otic routes; SYS-113 updated; new SYS-115 exchanges, SYS-116 discard of expired lots, SYS-117 one expiry per lot number (owner, 2026-11-11; ADR-010). | Claude, for owner review |
| 0.4 | 2026-11-11 | SYS-115: an accepted exchange counts the share of the target the clinician enters (owner, 2026-11-11; ADR-011). | Claude, for owner review |
| 0.5 | 2026-11-12 | Owner decisions of 2026-11-12 carried into SYS-007 (OD-017), SYS-102 (OD-009, OD-043), SYS-103 (OD-044), SYS-106 (OD-040), SYS-108 (OD-022), SYS-109 (OD-042, OD-045), SYS-303 (OD-014, OD-015), SYS-307 (OD-016), SYS-308 (OD-023), SYS-310 (OD-026). | Claude, for owner review |
| 0.6 | 2026-11-12 | SYS-115: tablets and suspension, alone or in portions (owner, 2026-11-12); acceptance pending OD-048. | Claude, for owner review |
| 0.7 | 2026-11-12 | SYS-104: biologics treated as cold chain (OD-049). | Claude, for owner review |
| 0.8 | 2026-11-12 | SYS-109 gases and missing product type (OD-051, REV-001); new SYS-118 controlled label in the floor-list picker (owner, 2026-11-12). | Claude, for owner review |
| 0.9 | 2026-11-12 | SYS-109: gases matched by dosage-form prefix (REV-002). | Claude, for owner review |
| 0.10 | 2026-11-12 | SYS-105: an unreadable expiry needs review like a missing one; every unambiguous label format is read (owner, 2026-11-13; ADR-022). SYS-107: a blocking issue means "No go"; "Not ready" retired (owner, 2026-11-12; OD-052, ADR-021). SYS-102: shelf-life rule file and its WHO source, verified by the owner; WHO's exceptions not applied (OD-053). | Claude, for owner review |
| 0.12 | 2026-11-13 | SpareWing iteration 1: SYS-301 alternates one way; SYS-302 no stock; SYS-303 availability every day; SYS-304 ETA and "unverified"; SYS-307 unknown pilots not counted; SYS-308 unknown return and ties; SYS-309 who records a decision (proposed, for owner review). Numbered 0.12 because the floor-coverage branch takes 0.11. | Claude, for owner review |
| 0.13 | 2026-11-13 | SYS-113 lots shown with their manufacturer; SYS-117 lots are per manufacturer, and a line without one is not treated as the same (owner, 2026-11-13; OD-054, ADR-024); SYS-112 documents marked reviewed by the lead clinician or team leader (owner, 2026-11-13); SYS-110 a target of 0 confirmed by the lead clinician (owner, 2026-11-13); SYS-112 empty floor list and stray exchanges mean "No go"; SYS-113 matching by catalogue entry and no lot counted twice; SYS-115 invalid or ineligible accepted exchanges (owner, 2026-11-13; ADR-023). (prepared as 0.11 on the floor-coverage branch, renumbered after the SpareWing merge) SYS-106 meter decisions (owner, 2026-11-15). | Claude, for owner review |
| 0.14 | 2026-11-15 | SYS-301 to SYS-309: the SpareWing interpretations decided by the owner (owner, 2026-11-15; ADR-025): alternates one way, with an interchange to confirm; SYS-304 "data missing" in place of "unknown". Numbered 0.14 because the floor-coverage branch takes 0.13. | Claude, for owner review |
| 0.15 | 2026-11-15 | SYS-108: exchanges are not alternatives; counting a chosen alternative is open (OD-055). SYS-108: chosen alternatives count what the clinician enters (owner, 2026-11-15; OD-055, ADR-026). | Claude, for owner review |
| 0.16 | 2026-11-15 | SYS-117: no lot number or readable expiry needs clarification; lot numbers kept as entered; merge review reasons carried into eligibility (owner, 2026-11-15; ADR-027). Numbered 0.16 because the open alternatives branch takes 0.15. | Claude, for owner review |
| 0.17 | 2026-11-15 | SYS-108: an alternative brings no class the floor item lacks; alternatives listed for every item and marked as offered when the item is short (owner, 2026-11-15; ADR-028). Numbered 0.17 because the merge follow-ups branch takes 0.16. | Claude, for owner review |
| 0.18 | 2026-11-15 | SYS-108: a chosen alternative entered beyond its lot's quantity needs review; an ineligible lot is reported before a missing amount, for alternatives and exchanges (SYS-115) (owner, 2026-11-15; ADR-029); OD-056 open. | Claude, for owner review |
| 0.19 | 2026-11-15 | SYS-115: an accepted exchange is not checked against its lot's count (owner, 2026-11-15; OD-056, ADR-029). | Claude, for owner review |
| 0.20 | 2026-11-15 | SYS-301 part numbers compared ignoring spaces and letter case; SYS-306 invalid order lead time reads as not entered; new SYS-311 quantity of a part needed (owner, 2026-11-15; ADR-030). | Claude, for owner review |
| 0.21 | 2026-11-16 | SpareWing review decisions (owner, 2026-11-16; ADR-032): SYS-303 ratings compared without spaces or case, no required ratings or swapped dates are data missing, duty and rest limits wanted in the MVP (OD-059); SYS-307 cover aircraft availability, swapped dates and no schedule leave missed flights unknown; SYS-308 unknown missed flights rank last; SYS-309 decision time and option checked. | Claude, for owner review |
| 0.22 | 2026-11-16 | SYS-303: duty and rest limits deferred until after the hackathon (owner, 2026-11-16; OD-059, ADR-033). | Claude, for owner review |
| 0.23 | 2026-11-16 | New SYS-312 placeholder rules shown as placeholders; rule files refused when they name a key twice; aircraft types matched without spaces or case (owner, 2026-11-16; ADR-034). | Claude, for owner review |
