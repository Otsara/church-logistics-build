# Submission checklist

One line per hackathon submission requirement in DOC-100 (SUB-001 to SUB-007). Tick a line only when the requirement is met, and add the evidence after it: a link, a date, a file or a check result. `pnpm docs:check --strict` fails while any line is unticked. The owner ticks the lines for the submission itself (SUB-001, SUB-002, SUB-006, SUB-007).

Submission page: https://aiforchurch.com/hackathon. Deadline: November 27, 2026, 11:59 PM ET.

- [x] SUB-001 Deadline and build window. Evidence: first commit b9d7033 dated 2026-11-07, inside the build window (October 30 to November 27, 2026); form submitted on 2026-11-27 at 11:46 am Central (17:46 UTC), before the deadline of 10:59 pm Central (owner, 2026-11-27).
- [x] SUB-002 Demo video of 5 minutes or less on YouTube, Vimeo or Loom. Evidence: https://youtu.be/K5EtOJtmWoc (YouTube, unlisted), 4:55.
- [x] SUB-003 AI made it and AI is in it. Evidence: in the video, the AI reads a donor's list at 0:36 and a person checks each line at 1:01; the AI explains the gaps at 2:01 and a check refuses a wrong AI sentence at 2:17; the AI drafts the covering letter at 2:31 and a person marks it reviewed. The description and the limits card (4:27) say the app was built with Claude Code and Lovable.
- [x] SUB-004 Honest, kind and safe. Evidence: the description says "Prototype: placeholder rule values, no outside pharmacist review yet, synthetic data only", and the video's limits card (4:27) says the same; the lint rule in `eslint.config.mjs` (passing in `pnpm check`) and the Prepped app's test "never uses the word approved" keep the word out of code and screens.
- [x] SUB-005 Sample data only. Evidence: every name, lot and figure is synthetic; the demo screens use hand-written made-up examples, and the tests and the confirmation run use `packages/synth` data with recorded seeds, for example scenario P001, seed 186663368, in `data/synthetic/development/prepped.json` (OD-071).
- [x] SUB-006 Submission contents. Evidence: name Prepped; the description below (249 words); Pioneer Track; video https://youtu.be/K5EtOJtmWoc; live demo https://prepped-for-anything.lovable.app; repository https://github.com/Otsara/church-logistics-build, public until judging ends (OD-066).
- [x] SUB-007 One project, Pioneer Track. Evidence: Pioneer Track chosen on the form for Prepped alone; the description's sections cover the criteria: ministry problem and who it serves ("What is it", "Problem it solves for churches"), original thinking (AI reads, tested rules decide, sealed test data), responsible and faithful use of AI ("Responsible AI & safeguards"), working demo (the live demo link and the video).

## Description as submitted

What is it and how does it work?
Prepped helps a medical mission team's pharmacist and lead clinician get donated medicines ready for a trip. Paste a donor's list: AI reads each line, and a person confirms it against the box. Tested rules then check every lot against the arrival date, count stock toward the clinician's minimum list, and show Go or No go with what stands in the way.

Problem it solves for churches
Mission teams pack medicines from many donors, from messy lists, before departure. An expired lot, a short supply or a missing import permit can stop a shipment at customs or reach a patient. Prepped makes preparation a checked list the team shares, even offline.

How AI is used
Claude reads donor lists, explains the gaps, and drafts a covering letter for customs. Claude Code and Lovable built the app.

Responsible AI & safeguards
The AI decides nothing: what may go, and Go or No go, come from tested rules. Every AI answer is checked by code or falls back to manual entry. Names never reach the AI. Drafts stay labelled until a person reviews them, and only the lead clinician signs off. On sealed test data, no AI reading was accepted with a wrong quantity, lot or expiry. Prototype: placeholder rule values, no outside pharmacist review yet, synthetic data only.

Tech stack / tools used
TypeScript, React, Vite, Tailwind CSS, Supabase (sign-in, team sync, AI gateway), Claude Haiku 5.5, Claude Code, Lovable, Vitest, Stryker.

## Known issues

- **picomatch advisory GHSA-fc5q-39xc-vjpf** (a slow pattern match, ReDoS). No patched version had been released by the submission; 4.0.7 is the newest. picomatch runs only inside the build and test tools, never in the app, and the weakness needs an attacker-supplied pattern. The audit exception stays, and a scheduled task checks for a fix until November 27 (owner, 2026-11-24; SEC-004, ADR-043).
- **Long donor lists go to manual entry.** The AI's answer is limited to 4,096 tokens (`MAX_OUTPUT_TOKENS`), so a pasted list of more than about 15 lines, or of lines with long multi-ingredient strengths, is not read; the screen falls back to manual entry, as it does for any failed AI step (SYS-009). Paste a long list in parts (found in the confirmation-run rehearsal, 2026-11-26).
- **Audit log display.** For sync-conflict entries the Trip column shows "Team stock", and before-and-after shows the raw record text. The entries themselves are complete and correct (owner's two-device run, 2026-11-27).
- **Some donor lines go unread.** When the model copies the prompt's line number into its copy of a line ("2: Amoxicillin …"), the check cannot match it, and the line is left for the person to enter by hand. Safe, but slower; found when the golden answers were recorded (2026-11-27; ADR-060).
- **No framing or script-blocking headers.** The free lovable.app hosting sends HTTPS (with strict-transport-security), nosniff and referrer-policy headers, but lets no app add a Content-Security-Policy or block framing. To be added when the app moves to hosting that allows it (2026-11-27; SEC-003, ADR-061).
