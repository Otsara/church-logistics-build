// Tests for the reconciliation check. Run with: node --test "tools/*.test.mjs"
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildModel,
  checkModel,
  checkSafetyCritical,
  checkSubmission,
  checkTests,
  parseFrontMatter,
  parseItems,
  renderGenerated,
  replaceGenerated,
  scanTests,
  submittedProduct,
  versionBumpErrors,
} from "./check-docs.mjs";

const doc = (
  id,
  body,
  { version = "0.1", status = "Draft", effective = "" } = {},
) => ({
  path: `docs/${id}-test.md`,
  text: [
    "---",
    `id: ${id}`,
    `title: Test ${id}`,
    `version: ${version}`,
    `status: ${status}`,
    `effective_date: ${effective}`,
    "---",
    "",
    body,
    "",
    "## Revision history",
    "",
    "| Version | Date | Change | By |",
    "| --- | --- | --- | --- |",
    `| ${version} | 2026-11-10 | Test. | Test |`,
    "",
  ].join("\n"),
});

const item = (id, fields, text = "Text.") =>
  [
    `### ${id} Title of ${id}`,
    ...Object.entries(fields).map(([k, v]) => `- ${k}: ${v}`),
    "",
    text,
    "",
  ].join("\n");

/** A small, consistent controlled set: one use, need, requirement, hazard, control and test. */
const SET = () => [
  doc(
    "DOC-003",
    item("OD-001", {
      Status: "Open",
      Blocks: "submission",
      Affects: "SYS-101",
    }),
  ),
  doc("DOC-010", item("IU-101", { Product: "Prepped" })),
  doc(
    "DOC-020",
    item("UN-101", { Product: "Prepped", "Traces to": "IU-101" }) +
      item("SYS-101", {
        Product: "Prepped",
        "Traces to": "UN-101, RC-101",
        "Safety-critical": "yes",
        Formerly: "PE-1",
      }),
  ),
  doc(
    "DOC-030",
    item("HAZ-101", { Product: "Prepped", "Traces to": "IU-101" }) +
      item("RC-101", { Product: "Prepped", "Traces to": "HAZ-101" }),
  ),
  doc(
    "DOC-040",
    item("ARC-101", {
      Product: "Prepped",
      "Traces to": "SYS-101",
      "Safety-critical": "yes",
    }),
  ),
  doc(
    "DOC-070",
    item("TC-101", {
      Product: "Prepped",
      "Traces to": "SYS-101",
      Formerly: "P-1",
    }),
  ),
  doc("DOC-100", item("SUB-001", {})),
];

const run = (files, opts = {}) => {
  const model = buildModel(files);
  return { model, result: checkModel(model, opts) };
};

test("parseFrontMatter reads key: value lines and the body", () => {
  const { meta, body } = parseFrontMatter(
    "---\nid: DOC-001\nversion: 0.2\n---\n# Title\n",
  );
  assert.deepEqual(meta, { id: "DOC-001", version: "0.2" });
  assert.equal(body, "# Title\n");
  assert.equal(parseFrontMatter("# No front matter").meta, null);
});

test("parseItems reads headings and their fields, and rejects malformed IDs", () => {
  const { items, errors } = parseItems(
    "### SYS-101 Days remaining\n- Product: Prepped\n- Traces to: UN-101\n\nBody.\n### SYS-12 Bad\n### Ordinary heading\n",
    "x.md",
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].id, "SYS-101");
  assert.equal(items[0].fields["Traces to"], "UN-101");
  assert.match(errors.join("\n"), /"SYS-12" is not a valid item ID/);
});

test("a consistent set has no errors and no gaps", () => {
  const { model, result } = run(SET());
  assert.deepEqual(model.errors, []);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.gaps, []);
});

test("example items in code blocks and inline code are ignored", () => {
  const files = SET();
  files[0] = doc(
    "DOC-003",
    item("OD-001", { Status: "Open", Blocks: "none" }) +
      "\n```markdown\n### SYS-999 Example\n```\n\nFor example `add SYS-998`.\n",
  );
  const { model, result } = run(files);
  assert.equal(model.items.has("SYS-999"), false);
  assert.deepEqual(result.errors, []);
});

test("front matter, revision history and approval rules are enforced", () => {
  const bad = doc("DOC-020", "Body.", { version: "1.0", status: "Approved" });
  bad.text = bad.text.replace("| 1.0 | 2026-11-10", "| 0.9 | 2026-11-10");
  const model = buildModel([
    bad,
    { path: "docs/DOC-030-x.md", text: "No front matter" },
  ]);
  const text = model.errors.join("\n");
  assert.match(text, /needs effective_date/);
  assert.match(
    text,
    /last revision history row must be for version 1\.0 \(found 0\.9\)/,
  );
  assert.match(text, /DOC-030-x\.md: controlled documents need front matter/);
});

test("duplicates, wrong home, undefined and malformed references are errors", () => {
  const files = SET();
  files.push(
    doc(
      "DOC-040",
      item("SYS-101", { Product: "Prepped", "Traces to": "UN-101" }) +
        "\nSee SYS-555 and SYS-12.\n",
    ),
  );
  files[files.length - 1].path = "docs/DOC-040-second.md";
  const { model, result } = run(files);
  const text = [...model.errors, ...result.errors].join("\n");
  assert.match(text, /SYS-101 is defined twice/);
  assert.match(text, /SYS-101 must be defined in DOC-020, not DOC-040/);
  assert.match(text, /SYS-555 is referenced but never defined/);
  assert.match(text, /"SYS-12" is not a valid ID/);
});

test("product ranges, trace rules and aliases are enforced", () => {
  const files = SET();
  files[2] = doc(
    "DOC-020",
    item("UN-101", { Product: "Prepped", "Traces to": "IU-101" }) +
      item("SYS-101", {
        Product: "SpareWing",
        "Traces to": "RC-101",
        Formerly: "P-1",
      }) +
      item("SYS-102", { Product: "Prepped", "Traces to": "UN-101, TC-101" }) +
      item("SYS-103", {
        Product: "Elsewhere",
        "Traces to": "UN-101",
        Formerly: "SYS-001",
      }),
  );
  const { result } = run(files);
  const text = result.errors.join("\n");
  assert.match(text, /SYS-101 is outside the SpareWing range 300-499/);
  assert.match(text, /SYS-101 must trace to at least one UN/);
  assert.match(text, /alias P-1 is already used by/);
  assert.match(text, /SYS-102 traces to TC-101; SYS may trace only to UN, RC/);
  assert.match(text, /SYS-103 needs "Product: Shared, Prepped or SpareWing"/);
  assert.match(text, /"SYS-001" in Formerly looks like a current ID/);
});

test("open decisions: fields, closed decisions need the owner, strict fails on blockers", () => {
  const files = SET();
  files[0] = doc(
    "DOC-003",
    item("OD-001", { Status: "Open", Blocks: "submission" }) +
      item("OD-002", { Status: "Closed", Blocks: "none", Decision: "Done." }) +
      item("OD-003", { Status: "Maybe", Blocks: "later" }),
  );
  const normal = run(files).result.errors.join("\n");
  assert.match(
    normal,
    /OD-002 is closed without a "Decision:" recorded as \(owner, YYYY-MM-DD\)/,
  );
  assert.match(normal, /OD-003 needs "Status: Open"/);
  assert.match(normal, /OD-003 needs "Blocks:/);
  assert.doesNotMatch(normal, /OD-001 is open/);
  assert.match(
    run(files, { strict: true }).result.errors.join("\n"),
    /OD-001 is open and blocks the submission/,
  );
});

test("coverage gaps are warnings, and errors under strict", () => {
  const files = SET();
  files[5] = doc("DOC-070", "No tests defined.");
  const normal = run(files).result;
  assert.deepEqual(normal.errors, []);
  assert.deepEqual(normal.warnings, ["SYS-101 has no test case"]);
  assert.match(
    run(files, { strict: true }).result.errors.join("\n"),
    /SYS-101 has no test case/,
  );
});

test("TBD is not allowed in an Approved document", () => {
  const files = SET();
  files[1] = doc(
    "DOC-010",
    item("IU-101", { Product: "Prepped" }, "Devices: TBD."),
    {
      version: "1.0",
      status: "Approved",
      effective: "2026-11-11",
    },
  );
  assert.match(
    run(files).result.errors.join("\n"),
    /must not contain TBD \(1 found\)/,
  );
});

test("scanTests reads tags and status, and rejects untagged tests and .only", () => {
  const scanned = scanTests([
    {
      path: "a.test.ts",
      text: [
        "it.todo('[TC-101] Given')",
        "it('[ARC-101, SYS-101] x', () => {})",
        "it('untagged', () => {})",
        "it.only('[TC-101] y', () => {})",
        "/x/.test(s)",
      ].join("\n"),
    },
  ]);
  assert.deepEqual(
    scanned.tests.map((t) => [t.ids.join(" "), t.status]),
    [
      ["TC-101", "placeholder"],
      ["ARC-101 SYS-101", "implemented"],
      ["TC-101", "implemented"],
    ],
  );
  assert.match(
    scanned.errors.join("\n"),
    /a\.test\.ts:3: test title must start/,
  );
  assert.match(
    scanned.errors.join("\n"),
    /a\.test\.ts:4: \.only must not be committed/,
  );
});

test("checkTests: unknown or untestable tags, test cases without tests, strict placeholders", () => {
  const { model } = run(SET());
  const none = checkTests(
    model,
    scanTests([
      { path: "a.test.ts", text: "it('[SYS-777, OD-001] x', () => {})" },
    ]),
  );
  const text = none.errors.join("\n");
  assert.match(text, /SYS-777 is not defined/);
  assert.match(text, /OD-001 is not a testable item/);
  assert.match(text, /TC-101 has no test/);
  const placeholder = scanTests([
    { path: "a.test.ts", text: "it.todo('[TC-101] x')" },
  ]);
  assert.deepEqual(checkTests(model, placeholder).errors, []);
  assert.match(
    checkTests(model, placeholder, { strict: true }).errors.join("\n"),
    /TC-101 is still a placeholder/,
  );
});

test("checkSafetyCritical needs an implemented test for each safety-critical item", () => {
  const { model, result } = run(SET());
  const placeholder = checkTests(
    model,
    scanTests([{ path: "a.test.ts", text: "it.todo('[TC-101] x')" }]),
  );
  const missing = checkSafetyCritical(model, result, placeholder).join("\n");
  assert.match(
    missing,
    /SYS-101 is safety-critical and has no implemented test/,
  );
  assert.match(
    missing,
    /ARC-101 is safety-critical and has no implemented test/,
  );
  const done = checkTests(
    model,
    scanTests([
      { path: "a.test.ts", text: "it('[TC-101, ARC-101] x', () => {})" },
    ]),
  );
  assert.deepEqual(checkSafetyCritical(model, result, done), []);
});

test("checkSubmission lists every SUB item once; strict needs every line ticked", () => {
  const { model } = run(SET());
  assert.match(
    checkSubmission(model, "").errors.join("\n"),
    /SUB-001 is missing/,
  );
  assert.deepEqual(checkSubmission(model, "- [ ] SUB-001 Deadline").errors, []);
  assert.match(
    checkSubmission(model, "- [ ] SUB-001 Deadline", {
      strict: true,
    }).errors.join("\n"),
    /SUB-001 is not ticked/,
  );
  assert.match(
    checkSubmission(
      model,
      "- [x] SUB-001 a\n- [x] SUB-001 b\n- [ ] SUB-002 c",
    ).errors.join("\n"),
    /twice[\s\S]*SUB-002, which is not defined/,
  );
});

test("versionBumpErrors: content changes need a new version; accepted ADRs are frozen", () => {
  const before = doc("DOC-020", "Old text.").text;
  const changed = before.replace("Old text.", "New text.");
  const bumped = doc("DOC-020", "New text.", { version: "0.2" }).text;
  const regenerated = before.replace(
    "Old text.",
    "Old text.\n<!-- BEGIN GENERATED -->\nx\n<!-- END GENERATED -->",
  );
  const regeneratedAgain = regenerated.replace("\nx\n", "\ny\n");
  assert.deepEqual(
    versionBumpErrors([{ path: "docs/DOC-020-a.md", before, after: bumped }]),
    [],
  );
  assert.deepEqual(
    versionBumpErrors([
      {
        path: "docs/DOC-020-a.md",
        before: regenerated,
        after: regeneratedAgain,
      },
    ]),
    [],
  );
  assert.match(
    versionBumpErrors([
      { path: "docs/DOC-020-a.md", before, after: changed },
    ]).join("\n"),
    /changed without a version bump/,
  );
  const adr = "---\nid: ADR-001\nstatus: Accepted\n---\nDecision A.\n";
  assert.match(
    versionBumpErrors([
      {
        path: "docs/adr/ADR-001-x.md",
        before: adr,
        after: adr.replace("A.", "B."),
      },
    ]).join("\n"),
    /Accepted and must not be edited/,
  );
});

test("ADR files need an id, a known status and an owner decision when accepted", () => {
  const files = [
    ...SET(),
    {
      path: "docs/adr/ADR-001-good.md",
      text: "---\nid: ADR-001\ntitle: Good\nstatus: Accepted\ndecided: owner, 2026-11-10\n---\nBody\n",
    },
    {
      path: "docs/adr/ADR-002-bad.md",
      text: "---\nid: ADR-002\ntitle: Bad\nstatus: Accepted\n---\nBody\n",
    },
    {
      path: "docs/adr/ADR-003-wrong.md",
      text: "---\nid: ADR-004\ntitle: Wrong\nstatus: Pending\n---\nBody\n",
    },
  ];
  const text = buildModel(files).errors.join("\n");
  assert.match(
    text,
    /ADR-002-bad\.md: an Accepted ADR needs "decided: owner, YYYY-MM-DD"/,
  );
  assert.match(text, /ADR-003-wrong\.md: file name must start with ADR-004-/);
  assert.match(text, /ADR-003-wrong\.md: status must be one of/);
  assert.doesNotMatch(text, /ADR-001/);
});

test("generated sections are deterministic and placed between the markers", () => {
  const { model, result } = run(SET());
  const tests = checkTests(
    model,
    scanTests([{ path: "a.test.ts", text: "it.todo('[TC-101] x')" }]),
  );
  const first = renderGenerated(model, result, tests);
  assert.deepEqual(first, renderGenerated(model, result, tests));
  assert.match(
    first["DOC-001"],
    /\| DOC-020 \| Test DOC-020 \| 0\.1 \| Draft \|/,
  );
  assert.match(first["DOC-003"], /\| OD-001 \| Title of OD-001 \|/);
  assert.match(
    first["DOC-080"],
    /\| TC-101 \| SYS-101 \| `a\.test\.ts` \| Placeholder \|/,
  );
  assert.match(
    first["DOC-080"],
    /\| HAZ-101 \| RC-101 \| SYS-101 \| TC-101 \|/,
  );
  const page =
    "Intro\n<!-- BEGIN GENERATED -->\nold\n<!-- END GENERATED -->\nEnd";
  assert.equal(
    replaceGenerated(page, "new"),
    "Intro\n<!-- BEGIN GENERATED -->\nnew\n<!-- END GENERATED -->\nEnd",
  );
});

test("the strict gate checks shared items and the submitted product's; the other product's are left out (owner, 2026-11-23, D1)", () => {
  const files = SET().map((f) =>
    f.path.includes("DOC-100")
      ? doc("DOC-100", item("SUB-001", { "Submitted product": "SpareWing" }))
      : f,
  );
  const model = buildModel(files);
  assert.equal(submittedProduct(model), "SpareWing");
  assert.equal(submittedProduct(buildModel(SET())), null);
  const opts = { strict: true, submitted: "SpareWing" };
  const coverage = checkModel(model, opts);
  const placeholder = checkTests(
    model,
    scanTests([{ path: "a.test.ts", text: "it.todo('[TC-101] x')" }]),
    opts,
  );
  // TC-101, SYS-101 and ARC-101 are Prepped's: not counted against a SpareWing submission.
  assert.deepEqual(placeholder.errors, []);
  assert.deepEqual(checkSafetyCritical(model, coverage, placeholder, opts), []);
  // Submitting Prepped, the same items are checked as before.
  const prepped = { strict: true, submitted: "Prepped" };
  assert.match(
    checkTests(
      model,
      scanTests([{ path: "a.test.ts", text: "it.todo('[TC-101] x')" }]),
      prepped,
    ).errors.join("\n"),
    /TC-101 is still a placeholder/,
  );
  assert.match(
    checkSafetyCritical(model, coverage, placeholder, prepped).join("\n"),
    /SYS-101 is safety-critical and has no implemented test/,
  );
});

test("a deferred item is left out of the strict gate, and its coverage gaps are warnings (owner, 2026-11-23, D4)", () => {
  const files = SET().map((f) => {
    if (f.path.includes("DOC-070"))
      return doc(
        "DOC-070",
        item("TC-101", {
          Product: "Prepped",
          "Traces to": "SYS-101",
          Status: "Deferred (owner, 2026-11-23)",
        }),
      );
    if (f.path.includes("DOC-040"))
      return doc(
        "DOC-040",
        item("ARC-101", {
          Product: "Prepped",
          "Traces to": "SYS-101",
          "Safety-critical": "yes",
          Status: "Deferred (owner, 2026-11-23)",
        }),
      );
    if (f.path.includes("DOC-020"))
      return doc(
        "DOC-020",
        item("UN-101", { Product: "Prepped", "Traces to": "IU-101" }) +
          item("SYS-101", {
            Product: "Prepped",
            "Traces to": "UN-101, RC-101",
            "Safety-critical": "yes",
            Status: "Deferred (owner, 2026-11-23)",
          }),
      );
    return f;
  });
  const model = buildModel(files);
  const opts = { strict: true, submitted: "Prepped" };
  const coverage = checkModel(model, opts);
  const placeholder = checkTests(
    model,
    scanTests([{ path: "a.test.ts", text: "it.todo('[TC-101] x')" }]),
    opts,
  );
  assert.deepEqual(placeholder.errors, []);
  assert.deepEqual(checkSafetyCritical(model, coverage, placeholder, opts), []);
  assert.ok(!coverage.errors.some((e) => /SYS-101|TC-101|ARC-101/.test(e)));
});
