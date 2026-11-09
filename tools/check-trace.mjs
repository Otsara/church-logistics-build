#!/usr/bin/env node
// Checks that docs/BUILD_SPEC.md and the tests agree, and writes docs/TRACEABILITY.md.
// The rules it enforces are in docs/BUILD_SPEC.md, section "Traceability".
//
//   node tools/check-trace.mjs            check; fail on errors or a stale matrix
//   node tools/check-trace.mjs --update   regenerate docs/TRACEABILITY.md, then check
//   node tools/check-trace.mjs --strict   submission gate: also fail on placeholders,
//                                         untested rules and open questions

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ID_SOURCE = String.raw`(?:AI-[PS]\d+|(?:PE|PR|SC|SI|AR|F|P|S|X|Q)-\d+)`;
const ID_EXACT = new RegExp(`^${ID_SOURCE}$`);

/** The kind of item an ID names, from its prefix. */
export function kindOf(id) {
  const prefix = id.startsWith("AI-") ? "AI" : id.slice(0, id.indexOf("-"));
  if (["P", "S", "X"].includes(prefix)) return "acceptance";
  if (["PE", "PR", "SC", "SI", "AR", "AI"].includes(prefix)) return "rule";
  if (prefix === "F") return "foundation";
  return "question";
}

/** Natural order: by prefix, then by number. */
function compareIds(a, b) {
  const [pa, na] = [a.replace(/\d+$/, ""), Number(/\d+$/.exec(a)?.[0])];
  const [pb, nb] = [b.replace(/\d+$/, ""), Number(/\d+$/.exec(b)?.[0])];
  return pa === pb ? na - nb : pa.localeCompare(pb);
}

/**
 * Reads the spec. An ID is defined where it is written in bold (**ID**); every other mention is a
 * reference. Returns the items, the spec version and any errors.
 */
export function parseSpec(text) {
  const errors = [];
  const items = new Map();
  const lines = text.split("\n");
  const version = /^Version:\s*([\d.]+)/m.exec(text)?.[1] ?? "unknown";
  const boldId = new RegExp(String.raw`\*\*(${ID_SOURCE})\*\*`, "g");
  const anyId = new RegExp(String.raw`(?<![\w-])(${ID_SOURCE})(?![\w-])`, "g");

  lines.forEach((line, index) => {
    for (const match of line.matchAll(boldId)) {
      const id = match[1];
      if (items.has(id)) {
        errors.push(
          `${id} is defined twice (lines ${items.get(id).line} and ${index + 1})`,
        );
        continue;
      }
      items.set(id, {
        id,
        kind: kindOf(id),
        line: index + 1,
        text: line,
        traces: [],
      });
    }
  });

  lines.forEach((line, index) => {
    for (const match of line.matchAll(anyId)) {
      if (!items.has(match[1])) {
        errors.push(
          `line ${index + 1}: ${match[1]} is referenced but never defined`,
        );
      }
    }
  });

  for (const item of items.values()) {
    if (item.kind === "acceptance") {
      const traces = /\(traces to ([^)]+)\)/.exec(item.text);
      if (traces === null) {
        errors.push(`${item.id} has no "(traces to ...)" list`);
        continue;
      }
      item.traces = traces[1].split(",").map((part) => part.trim());
      for (const target of item.traces) {
        if (!items.has(target)) {
          errors.push(`${item.id} traces to ${target}, which is not defined`);
        } else if (!["rule", "foundation"].includes(kindOf(target))) {
          errors.push(
            `${item.id} traces to ${target}; only rules and foundation items can be traced to`,
          );
        }
      }
    }
    if (item.kind === "question") {
      const status = new RegExp(
        String.raw`\*\*${item.id}\*\*\s*\((open|closed)\b`,
      ).exec(item.text);
      if (status === null) {
        errors.push(
          `${item.id} needs "(open)" or "(closed ...)" straight after its ID`,
        );
      }
      item.status = status?.[1] ?? "unknown";
      item.title =
        /\)\s*\*\*(.+?)\*\*/.exec(item.text)?.[1]?.replace(/\.$/, "") ?? "";
    }
  }
  return { version, items, errors };
}

/**
 * Finds tests in TypeScript and JavaScript test files. Every test title starts with the IDs it
 * verifies in square brackets, for example it('[P-1] Given ...').
 */
export function scanTests(files) {
  const errors = [];
  const tests = [];
  const call =
    /(?<![.\w$])(it|test)(?:\.(todo|skip|only|fails))?\(\s*(['"`])((?:\\.|(?!\3)[^\\])*)\3/g;
  for (const { path, text } of files) {
    for (const match of text.matchAll(call)) {
      const [, , modifier, , title] = match;
      const line = text.slice(0, match.index).split("\n").length;
      const where = `${path}:${line}`;
      if (modifier === "only")
        errors.push(`${where}: .only must not be committed`);
      const tag = /^\[([^\]]+)\]/.exec(title);
      if (tag === null) {
        errors.push(
          `${where}: test title must start with its spec IDs in brackets, e.g. "[P-1] ..."`,
        );
        continue;
      }
      const ids = tag[1].split(/[\s,]+/).filter(Boolean);
      for (const id of ids) {
        if (!ID_EXACT.test(id))
          errors.push(`${where}: "${id}" is not a spec ID`);
      }
      const status =
        modifier === "todo"
          ? "placeholder"
          : modifier === "skip"
            ? "skipped"
            : "implemented";
      tests.push({
        where,
        path,
        ids: ids.filter((id) => ID_EXACT.test(id)),
        status,
      });
    }
  }
  return { tests, errors };
}

/** Joins the spec and the tests into a report. */
export function buildReport(spec, scanned, { strict = false } = {}) {
  const errors = [...spec.errors, ...scanned.errors];
  const warnings = [];
  const testsFor = (id) =>
    scanned.tests.filter((test) => test.ids.includes(id));

  for (const test of scanned.tests) {
    for (const id of test.ids) {
      if (!spec.items.has(id))
        errors.push(`${test.where}: ${id} is not defined in the spec`);
      else if (kindOf(id) === "question")
        errors.push(`${test.where}: ${id} is a question and cannot be tested`);
    }
  }

  const all = [...spec.items.values()].sort((a, b) => compareIds(a.id, b.id));
  const acceptance = all
    .filter((item) => item.kind === "acceptance")
    .map((item) => {
      const tests = testsFor(item.id);
      const status =
        tests.length === 0
          ? "missing"
          : tests.every((t) => t.status === "implemented")
            ? "implemented"
            : "placeholder";
      if (status === "missing")
        errors.push(
          `${item.id} has no test (add at least an it.todo placeholder)`,
        );
      if (strict && status === "placeholder")
        errors.push(`${item.id} is still a placeholder or skipped`);
      return { id: item.id, traces: item.traces, tests, status };
    });

  const covered = all
    .filter((item) => item.kind === "rule" || item.kind === "foundation")
    .map((item) => {
      const viaAcceptance = acceptance.filter((a) =>
        a.traces.includes(item.id),
      );
      const direct = testsFor(item.id);
      const implemented =
        viaAcceptance.some((a) => a.status === "implemented") ||
        direct.some((t) => t.status === "implemented");
      const status = implemented
        ? "tested"
        : viaAcceptance.length + direct.length > 0
          ? "placeholder"
          : "untraced";
      if (item.kind === "rule" && status === "untraced") {
        (strict ? errors : warnings).push(
          `${item.id} is not traced to any acceptance test or test`,
        );
      } else if (strict && item.kind === "rule" && status === "placeholder") {
        errors.push(`${item.id} has only placeholder tests`);
      }
      return {
        id: item.id,
        kind: item.kind,
        viaAcceptance: viaAcceptance.map((a) => a.id),
        direct,
        status,
      };
    });

  const questions = all.filter((item) => item.kind === "question");
  const open = questions.filter((q) => q.status === "open");
  if (strict) for (const q of open) errors.push(`${q.id} is still open`);

  return {
    version: spec.version,
    acceptance,
    covered,
    questions,
    errors,
    warnings,
  };
}

const STATUS_TEXT = {
  implemented: "Implemented",
  placeholder: "Placeholder",
  missing: "Missing",
  tested: "Tested",
  untraced: "Not traced",
};

/** Renders the report as docs/TRACEABILITY.md. Deterministic: no dates or timings. */
export function renderMatrix(report) {
  const files = (tests) =>
    [...new Set(tests.map((t) => `\`${t.path}\``))].join(", ") || "–";
  const count = (list, status) =>
    list.filter((x) => x.status === status).length;
  const rules = report.covered.filter((c) => c.kind === "rule");
  const open = report.questions.filter((q) => q.status === "open");
  const out = [
    "# Traceability matrix",
    "",
    `Generated by \`tools/check-trace.mjs\` from \`docs/BUILD_SPEC.md\` version ${report.version} and the test files. Do not edit by hand: run \`pnpm trace:update\`.`,
    "",
    "## Summary",
    "",
    "| Measure | Count |",
    "| --- | --- |",
    `| Acceptance tests implemented | ${count(report.acceptance, "implemented")} of ${report.acceptance.length} |`,
    `| Acceptance tests still placeholders | ${count(report.acceptance, "placeholder")} |`,
    `| Rules and AI contracts tested | ${count(rules, "tested")} of ${rules.length} |`,
    `| Rules and AI contracts not traced to any test | ${count(rules, "untraced")} |`,
    `| Open questions | ${open.length} of ${report.questions.length} |`,
    "",
    "## Acceptance tests",
    "",
    "| ID | Traces to | Test file | Status |",
    "| --- | --- | --- | --- |",
    ...report.acceptance.map(
      (a) =>
        `| ${a.id} | ${a.traces.join(", ")} | ${files(a.tests)} | ${STATUS_TEXT[a.status]} |`,
    ),
    "",
    "## Rules, AI contracts and foundation decisions",
    "",
    '"Tested" means at least one implemented test verifies the item, directly or through an acceptance test.',
    "",
    "| ID | Acceptance tests | Direct tests | Status |",
    "| --- | --- | --- | --- |",
    ...report.covered.map(
      (c) =>
        `| ${c.id} | ${c.viaAcceptance.join(", ") || "–"} | ${files(c.direct)} | ${STATUS_TEXT[c.status]} |`,
    ),
    "",
    "## Open questions",
    "",
    "Close these as described in `docs/BUILD_SPEC.md`. `pnpm check:trace --strict` fails while any is open.",
    "",
    "| ID | Question | Status |",
    "| --- | --- | --- |",
    ...report.questions.map(
      (q) =>
        `| ${q.id} | ${q.title} | ${q.status === "open" ? "Open" : "Closed"} |`,
    ),
    "",
  ];
  return out.join("\n");
}

function findTestFiles(root) {
  const found = [];
  const skip = new Set(["node_modules", ".git", "coverage", "dist", "tools"]);
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.test\.(?:ts|tsx|js|mjs)$/.test(entry.name)) found.push(full);
    }
  };
  for (const top of ["packages", "apps"]) {
    if (existsSync(join(root, top))) walk(join(root, top));
  }
  return found.sort().map((full) => ({
    path: relative(root, full).split(sep).join("/"),
    text: readFileSync(full, "utf8"),
  }));
}

function main(args) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const strict = args.includes("--strict");
  const update = args.includes("--update");
  const matrixPath = join(root, "docs", "TRACEABILITY.md");

  const spec = parseSpec(
    readFileSync(join(root, "docs", "BUILD_SPEC.md"), "utf8"),
  );
  const report = buildReport(spec, scanTests(findTestFiles(root)), { strict });
  const matrix = renderMatrix(report);

  if (update) {
    writeFileSync(matrixPath, matrix);
    process.stdout.write("Wrote docs/TRACEABILITY.md\n");
  } else if (
    !existsSync(matrixPath) ||
    readFileSync(matrixPath, "utf8") !== matrix
  ) {
    report.errors.push(
      "docs/TRACEABILITY.md is out of date: run pnpm trace:update and commit it",
    );
  }

  for (const warning of report.warnings)
    process.stdout.write(`warning: ${warning}\n`);
  for (const error of report.errors) process.stderr.write(`error: ${error}\n`);
  const done = report.acceptance.filter(
    (a) => a.status === "implemented",
  ).length;
  const open = report.questions.filter((q) => q.status === "open").length;
  process.stdout.write(
    `Spec v${report.version}: ${done} of ${report.acceptance.length} acceptance tests implemented, ` +
      `${report.warnings.length} warnings, ${open} open questions, ${report.errors.length} errors` +
      `${strict ? " (strict)" : ""}\n`,
  );
  process.exitCode = report.errors.length > 0 ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2));
}
