---
id: REV-009
title: Line-by-line review of the SpareWing rule-file reader
date: 2026-11-16
---

# REV-009 Line-by-line review of the SpareWing rule-file reader

## Reviewed

`packages/core/src/sparewing/rule-files.ts` (ARC-301; SYS-303, SYS-307), from the pull request "SpareWing: rule files for ratings per aircraft type and cover bases per community" (merged before this review), reviewed in the build conversation on 2026-11-16. It checks each rule file's envelope, id, product and data, and looks up an aircraft type's required ratings and a community's cover bases, never throwing.

## Findings and the owner's decisions (owner, 2026-11-16; ADR-034)

| # | Finding | Decision |
|---|---|---|
| 1 | Aircraft types matched character for character. | Ignore leading and trailing spaces and letter case (TC-327). |
| 2 | The cover file lists bases per synthetic scenario, not per community as a real program would. | Keep for the MVP; deferred until after the hackathon (OD-060). |
| 3 | A type or community written twice would silently replace the first. | Refuse the file, naming each repeat (`json-text.ts`, TC-328). |
| 4 | No requirement said placeholder rules must be shown. | New SYS-312: "Placeholder rules: not for real flight decisions" beside every result relying on one (TC-329, with the screens). |

## Results after the fixes

100% line and branch coverage. Stryker mutation score 97.22% on `rule-files.ts` and 99.00% on the new `json-text.ts` (98.53% together). The two survivors are equivalent: folding aircraft types to lower case instead of upper case still ignores letter case, and the space skip just after an opening bracket is repeated by the reader of the first element.
