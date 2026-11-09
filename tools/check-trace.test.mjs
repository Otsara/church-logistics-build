// Tests for the traceability checker. Run with: node --test tools/
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildReport,
  kindOf,
  parseSpec,
  renderMatrix,
  scanTests,
} from "./check-trace.mjs";

const SPEC = [
  "Version: 1.2",
  "| **F-1** | Dates | Date-only |",
  "- **PE-1** Days remaining at arrival.",
  "- **PE-2** Untested rule.",
  "- **P-1** (traces to PE-1, F-1): Given a lot, then it is blocked.",
  "- **Q-1** (open) **Stack.** Storage is open. Affects PE-1.",
  "- **Q-2** (closed 2026-11-10, decided by Owner) **Names.** Settled.",
].join("\n");

const testFile = (body) => [
  { path: "packages/core/tests/a.test.ts", text: body },
];

test("kindOf classifies every prefix", () => {
  assert.equal(kindOf("P-1"), "acceptance");
  assert.equal(kindOf("X-3"), "acceptance");
  assert.equal(kindOf("PE-2"), "rule");
  assert.equal(kindOf("AI-S3"), "rule");
  assert.equal(kindOf("F-12"), "foundation");
  assert.equal(kindOf("Q-9"), "question");
});

test("parseSpec reads definitions, traces, question status and version", () => {
  const spec = parseSpec(SPEC);
  assert.deepEqual(spec.errors, []);
  assert.equal(spec.version, "1.2");
  assert.deepEqual(spec.items.get("P-1").traces, ["PE-1", "F-1"]);
  assert.equal(spec.items.get("Q-1").status, "open");
  assert.equal(spec.items.get("Q-1").title, "Stack");
  assert.equal(spec.items.get("Q-2").status, "closed");
});

test("parseSpec reports duplicates, undefined references and bad traces", () => {
  const spec = parseSpec(
    [
      "- **PE-1** One.",
      "- **PE-1** Again.",
      "See SC-9.",
      "- **P-1** Given no trace list.",
      "- **P-2** (traces to PE-1, Q-1, PE-7): Given.",
      "- **Q-1** **No status.**",
    ].join("\n"),
  );
  const text = spec.errors.join("\n");
  assert.match(text, /PE-1 is defined twice/);
  assert.match(text, /SC-9 is referenced but never defined/);
  assert.match(text, /P-1 has no "\(traces to/);
  assert.match(text, /P-2 traces to Q-1; only rules and foundation/);
  assert.match(text, /P-2 traces to PE-7, which is not defined/);
  assert.match(text, /Q-1 needs "\(open\)"/);
});

test("scanTests reads tags and status, and rejects untagged tests and .only", () => {
  const scanned = scanTests(
    testFile(
      [
        "it.todo('[P-1] Given a lot')",
        'it("[PE-1, F-1] counts days", () => {})',
        "it.skip('[PE-2] skipped', () => {})",
        "it('no tag', () => {})",
        "it.only('[P-1] focused', () => {})",
        "it('[P-1, nonsense] bad tag', () => {})",
        "/x/.test(value)",
      ].join("\n"),
    ),
  );
  assert.deepEqual(
    scanned.tests.map((t) => [t.ids.join(" "), t.status]),
    [
      ["P-1", "placeholder"],
      ["PE-1 F-1", "implemented"],
      ["PE-2", "skipped"],
      ["P-1", "implemented"],
      ["P-1", "implemented"],
    ],
  );
  const text = scanned.errors.join("\n");
  assert.match(text, /a\.test\.ts:4: test title must start with its spec IDs/);
  assert.match(text, /a\.test\.ts:5: \.only must not be committed/);
  assert.match(text, /"nonsense" is not a spec ID/);
});

test("buildReport: placeholders pass the normal check, untested rules warn", () => {
  const report = buildReport(
    parseSpec(SPEC),
    scanTests(testFile("it.todo('[P-1] Given')")),
  );
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.warnings, [
    "PE-2 is not traced to any acceptance test or test",
  ]);
  assert.equal(report.acceptance[0].status, "placeholder");
});

test("buildReport: a missing acceptance test and an unknown or question tag are errors", () => {
  const report = buildReport(
    parseSpec(SPEC),
    scanTests(testFile("it('[SC-1, Q-1] x', () => {})")),
  );
  const text = report.errors.join("\n");
  assert.match(text, /P-1 has no test/);
  assert.match(text, /SC-1 is not defined in the spec/);
  assert.match(text, /Q-1 is a question and cannot be tested/);
});

test("buildReport --strict fails on placeholders, untested rules and open questions", () => {
  const report = buildReport(
    parseSpec(SPEC),
    scanTests(testFile("it.todo('[P-1] Given')")),
    {
      strict: true,
    },
  );
  const text = report.errors.join("\n");
  assert.match(text, /P-1 is still a placeholder/);
  assert.match(text, /PE-1 has only placeholder tests/);
  assert.match(text, /PE-2 is not traced/);
  assert.match(text, /Q-1 is still open/);
  assert.doesNotMatch(text, /Q-2/);
});

test("buildReport --strict passes when everything is implemented, tested and closed", () => {
  const spec = SPEC.replace("(open)", "(closed 2026-11-10, decided by Owner)");
  const report = buildReport(
    parseSpec(spec),
    scanTests(
      testFile("it('[P-1] Given', () => {})\nit('[PE-2] direct', () => {})"),
    ),
    { strict: true },
  );
  assert.deepEqual(report.errors, []);
  assert.deepEqual(
    report.covered.map((c) => [c.id, c.status]),
    [
      ["F-1", "tested"],
      ["PE-1", "tested"],
      ["PE-2", "tested"],
    ],
  );
});

test("renderMatrix is deterministic and lists every item", () => {
  const report = buildReport(
    parseSpec(SPEC),
    scanTests(testFile("it.todo('[P-1] Given')")),
  );
  const matrix = renderMatrix(report);
  assert.equal(matrix, renderMatrix(report));
  assert.match(matrix, /version 1\.2/);
  assert.match(
    matrix,
    /\| P-1 \| PE-1, F-1 \| `packages\/core\/tests\/a\.test\.ts` \| Placeholder \|/,
  );
  assert.match(matrix, /\| PE-2 \| – \| – \| Not traced \|/);
  assert.match(matrix, /\| Q-1 \| Stack \| Open \|/);
  assert.match(matrix, /\| Open questions \| 1 of 2 \|/);
});
