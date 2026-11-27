# Submission checklist

One line per hackathon submission requirement in DOC-100 (SUB-001 to SUB-007). Tick a line only when the requirement is met, and add the evidence after it: a link, a date, a file or a check result. `pnpm docs:check --strict` fails while any line is unticked. The owner ticks the lines for the submission itself (SUB-001, SUB-002, SUB-006, SUB-007).

Submission page: https://aiforchurch.com/hackathon. Deadline: November 27, 2026, 11:59 PM ET.

- [ ] SUB-001 Deadline and build window. Evidence: submission date and time; first commit dated inside the window.
- [ ] SUB-002 Demo video of 5 minutes or less on YouTube, Vimeo or Loom. Evidence: link and length.
- [ ] SUB-003 AI made it and AI is in it. Evidence: the video timestamps where the AI steps run and a person reviews a draft.
- [ ] SUB-004 Honest, kind and safe. Evidence: the description's statement about placeholder rule values and reviewer status; no "approved" anywhere (lint).
- [ ] SUB-005 Sample data only. Evidence: every name, lot and figure is synthetic; the demo screens use hand-written made-up examples, and the tests and the confirmation run use `packages/synth` data with recorded seeds, for example scenario P001, seed 186663368, in `data/synthetic/development/prepped.json` (OD-071).
- [ ] SUB-006 Submission contents. Evidence: project name, description, track, video link, live demo link, repository link or the decision not to include one.
- [ ] SUB-007 One project, Pioneer Track. Evidence: the track chosen on the form; where the description covers each of the four criteria.

## Known issues

- **picomatch advisory GHSA-fc5q-39xc-vjpf** (a slow pattern match, ReDoS). No patched version had been released by the submission; 4.0.7 is the newest. picomatch runs only inside the build and test tools, never in the app, and the weakness needs an attacker-supplied pattern. The audit exception stays, and a scheduled task checks for a fix until November 27 (owner, 2026-11-24; SEC-004, ADR-043).
- **Long donor lists go to manual entry.** The AI's answer is limited to 4,096 tokens (`MAX_OUTPUT_TOKENS`), so a pasted list of more than about 15 lines, or of lines with long multi-ingredient strengths, is not read; the screen falls back to manual entry, as it does for any failed AI step (SYS-009). Paste a long list in parts (found in the confirmation-run rehearsal, 2026-11-26).
- **Audit log display.** For sync-conflict entries the Trip column shows "Team stock", and before-and-after shows the raw record text. The entries themselves are complete and correct (owner's two-device run, 2026-11-27).
- **Some donor lines go unread.** When the model copies the prompt's line number into its copy of a line ("2: Amoxicillin …"), the check cannot match it, and the line is left for the person to enter by hand. Safe, but slower; found when the golden answers were recorded (2026-11-27; ADR-060).
- **No framing or script-blocking headers.** The free lovable.app hosting sends HTTPS (with strict-transport-security), nosniff and referrer-policy headers, but lets no app add a Content-Security-Policy or block framing. To be added when the app moves to hosting that allows it (2026-11-27; SEC-003, ADR-061).
