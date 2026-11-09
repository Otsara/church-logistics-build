# Rule files

JSON rule files that a pharmacist or mechanic can read and correct (F-4). Core loads them; the AI never decides what they say (AR-3, AR-4).

Put Prepped files in `rules/prepped/` and SpareWing files in `rules/sparewing/`. The file name is the rule file's `id` plus `.json`.

Every file has this envelope, checked by `parseRuleFile` in `packages/core` and by the test that reads every file here:

```json
{
  "id": "shelf-life",
  "product": "prepped",
  "title": "Minimum shelf life at arrival",
  "status": "placeholder",
  "source": {
    "url": "https://...",
    "verified_date": null,
    "verified_by": null
  },
  "notes": "Optional. What a reviewer should know.",
  "data": {}
}
```

- `status` is `placeholder` until a qualified person checks the content against the source. A `verified` file must have `verified_date` (YYYY-MM-DD) and `verified_by`.
- `source.url` is always required.
- `data` holds the rule content. Its shape is defined by the stream that owns the rule, with its own schema and tests.
- Use synthetic names in examples. Never commit real personal data (CLAUDE.md rule 4).
