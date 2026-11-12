# Review records

One file per review, named `REV-nnn-short-title.md`, written when the owner reviews documents or code in the build conversation (DOC-000 §6, DOC-070 §4). Each record starts with front matter:

```yaml
---
id: REV-001
title: Review of the controlled document set v0.1
date: 2026-11-10
---
```

and states:

- **Reviewed:** document IDs and versions, or code units, files and the commit.
- **Findings:** each finding, and how it was resolved.
- **Decision:** approved, approved with changes, or not approved, recorded as "(owner, YYYY-MM-DD)".
- **For safety-critical code:** confirmation that the review was line by line, plus the coverage and mutation results reviewed.
