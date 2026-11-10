---
id: DOC-000
title: Document control procedure
version: 0.1
status: Draft
effective_date:
---

# DOC-000 Document control procedure

The controlled documents in `docs/` are the source of truth for what Prepped and SpareWing are, why, and how they are shown to be safe enough for their intended use. Code, tests and review copies follow them. Flight and pharmacy are high-risk activities, so every claim in these documents must be traceable, reviewable and owned.

## 1. Scope

This procedure covers every file in `docs/` that has `id: DOC-nnn` front matter, every decision record in `docs/adr/`, every review record in `docs/reviews/`, and the tests that verify them. `docs/BUILD_SPEC.md` is superseded by this set (ADR-001); `docs/TOOLCHAIN.md` and `docs/SUBMISSION.md` are supporting files governed by DOC-040 and DOC-100.

## 2. Document identity

Each controlled document is a Markdown file named `DOC-nnn-short-title.md`, starting with front matter:

```yaml
---
id: DOC-020
title: User needs and system requirements
version: 0.1
status: Draft
effective_date:
---
```

| Field | Rule |
| --- | --- |
| `id` | `DOC-nnn`, permanent, never reused. Matches the file name. |
| `version` | `0.x` while Draft; `N.0` when Approved; `N.1` and up while an approved document is being revised. |
| `status` | `Draft`, `In review`, `Approved`, `Superseded` or `Obsolete`. |
| `effective_date` | Set only when the owner approves the version (YYYY-MM-DD). |

Every document ends with a revision history table whose last row is the current version.

## 3. Item identity

Each controlled item (requirement, hazard, test, decision and so on) has a permanent ID `PREFIX-nnn`. An item is **defined** once, by a level-3 heading `### PREFIX-nnn Title`, followed directly by its fields:

```markdown
### SYS-101 Days remaining at arrival
- Product: Prepped
- Traces to: UN-101, RC-101
- Safety-critical: yes
- Formerly: PE-1
- Status: Draft

Days remaining at arrival = expiry date minus trip arrival date.
```

| Prefix | Item | Defined in | Must trace to |
| --- | --- | --- | --- |
| `OD` | Open decision | DOC-003 | (none) |
| `IU` | Intended use statement or limitation | DOC-010 | (none) |
| `UN` | User need | DOC-020 | IU |
| `SYS` | System requirement | DOC-020 | UN, and RC where it implements a risk control |
| `HAZ` | Hazard | DOC-030 | IU |
| `RC` | Risk control | DOC-030 | HAZ |
| `ARC` | Architecture element or foundation decision | DOC-040 | SYS, SEC, DAT (optional) |
| `AIC` | AI step contract | DOC-040 | SYS |
| `ADR` | Decision record (one file each) | `docs/adr/`, indexed in DOC-050 | (none) |
| `SEC` | Security or privacy requirement | DOC-060 | UN, RC |
| `DAT` | Data requirement | DOC-065 | UN, RC |
| `TC` | Test case | DOC-070 | SYS, SEC, DAT, AIC, ARC, RC |
| `SOUP` | Third-party software, service or data set | DOC-090 | (none) |
| `SUB` | Hackathon submission requirement | DOC-100 | (none) |
| `IT` | Iteration | DOC-100 | (none) |
| `REV` | Review record (one file each) | `docs/reviews/` | (none) |

Rules:

1. IDs are never renumbered or reused. A retired item keeps its heading and gets `Status: Retired` with the reason, so old references still resolve.
2. Number ranges show the product, so parallel streams never collide: **001–099 Shared, 100–299 Prepped, 300–499 SpareWing**, 500–999 reserved. Items with a product (`IU`, `UN`, `SYS`, `HAZ`, `RC`, `ARC`, `AIC`, `SEC`, `DAT`, `TC`) carry a `Product:` field that must match the range.
3. Each stream takes the next free number in its own range. If two branches pick the same number, the later merge renumbers its new, unmerged item before merging.
4. `Formerly:` lists the IDs an item had in `docs/BUILD_SPEC.md` (ADR-001). Old IDs are aliases only and are never given to another item.
5. Every ID mentioned anywhere in the controlled set must be defined.

## 4. Writing rules

1. **No invented facts.** Safety or regulatory classifications, clinical claims, standards clauses and numeric limits are never invented. Unknown content is written `TBD` with what is needed, and an open decision (DOC-003) is raised.
2. **Owner decisions** are recorded as "(owner, YYYY-MM-DD)" where they are used. A decision that crosses documents or affects safety also gets an ADR with context, options and consequences.
3. **Synthetic data only.** No real personal or health data appears anywhere in the repository (DOC-065).
4. **Generated sections** (between `<!-- BEGIN GENERATED -->` and `<!-- END GENERATED -->`) are written by `pnpm docs:update` and never edited by hand.

## 5. Versions and revision history

1. Every change to a controlled document bumps its version and adds a revision history row in the same commit. While a document is Draft, one bump per change set (pull request) is enough.
2. Commit messages name the documents and item IDs affected, for example `DOC-020 v0.2, DOC-070 v0.2: add SYS-110, TC-110`.
3. `pnpm docs:check --base origin/main` fails if a document changed without a version bump.

## 6. Review and approval

1. **Nothing is Approved, Verified, merged, tagged, deployed or published without the owner's explicit confirmation in the conversation.** An AI assistant never approves anything.
2. The owner reviews and approves in the chat of the build session. Each review is written up as a review record `docs/reviews/REV-nnn-*.md`: what was reviewed (document IDs and versions, or code units and commit), the owner's findings, the decision, and "(owner, YYYY-MM-DD)".
3. On approval: `status: Approved`, version `N.0`, `effective_date` set, the revision row names the review record, and any `TBD` in the document is resolved first.
4. Safety-critical code needs the owner's line-by-line review, recorded as a review record (DOC-070 §4).

## 7. Change control

1. A change to an **Approved** document starts a new draft version (`N.1`), cites the reason (an OD, ADR, review finding or failure report) in the revision row, and needs re-approval.
2. A change that affects safety or more than one document gets an ADR first.
3. Failures are reported with evidence. Investigations follow: reproduce, then causes, then a remedy plan that lists the decisions the owner owes (DOC-070 §6).

## 8. Reconciliation check

`tools/check-docs.mjs` (run with `pnpm docs:check`) checks:

- front matter, version format and revision history of every document;
- ID format, single definition, product ranges, aliases and references;
- trace links against the table in §3, and coverage gaps (needs without requirements, hazards without controls, requirements without tests);
- that every test case has a test, and every test title starts with the IDs it verifies;
- that generated sections are current.

`pnpm docs:update` regenerates the master index (DOC-001), the decision record index (DOC-050) and the traceability matrix (DOC-080). `pnpm docs:check --strict` is the release gate: it also fails on coverage gaps, placeholder tests, untested safety-critical requirements, `TBD` in Approved documents, unticked submission requirements, and open decisions that block release.

Every session runs `pnpm docs:update` then `pnpm docs:check` before finishing.

## 9. Review copies

At each review point (a pull request opened, merged, or baselined) the changed documents are republished as review copies on claude.ai, each stamped with document ID, version, status and source commit. Review copies are uncontrolled; the repository governs.

## 10. Open decisions and check-ins

DOC-003 lists every open decision and marks which ones block release. Scheduled check-ins (DOC-100) remind the owner of release blockers and decisions owed.

## Revision history

| Version | Date | Change | By |
| --- | --- | --- | --- |
| 0.1 | 2026-11-10 | First draft: document and item identity, number ranges by product, writing rules, versions, review and approval in chat with review records, change control, reconciliation check, review copies (ADR-001). | Claude, for owner review |
