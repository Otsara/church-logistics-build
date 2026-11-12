#!/usr/bin/env node
// Reconciliation check for the controlled document set (DOC-000 §8).
//
//   node tools/check-docs.mjs                  check; fail on errors or stale generated sections
//   node tools/check-docs.mjs --update         regenerate DOC-001, DOC-003, DOC-050 and DOC-080, then check
//   node tools/check-docs.mjs --strict         release gate: coverage gaps, placeholder tests, untested
//                                              safety-critical requirements, TBD in Approved documents,
//                                              unticked submission requirements and open release blockers
//                                              are errors too
//   node tools/check-docs.mjs --base <ref>     also fail when a document changed since <ref> without a
//                                              version bump

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** Item types: where each is defined, what it may trace to, and whether a trace is required. */
export const TYPES = {
  OD: { home: "DOC-003", parents: [], product: false },
  IU: { home: "DOC-010", parents: [], product: true },
  UN: { home: "DOC-020", parents: ["IU"], required: true, product: true },
  SYS: {
    home: "DOC-020",
    parents: ["UN", "RC"],
    required: true,
    mustInclude: "UN",
    product: true,
  },
  HAZ: { home: "DOC-030", parents: ["IU"], required: true, product: true },
  RC: { home: "DOC-030", parents: ["HAZ"], required: true, product: true },
  ARC: { home: "DOC-040", parents: ["SYS", "SEC", "DAT"], product: true },
  AIC: { home: "DOC-040", parents: ["SYS"], required: true, product: true },
  SEC: {
    home: "DOC-060",
    parents: ["UN", "RC"],
    required: true,
    product: true,
  },
  DAT: {
    home: "DOC-065",
    parents: ["UN", "RC"],
    required: true,
    product: true,
  },
  TC: {
    home: "DOC-070",
    parents: ["SYS", "SEC", "DAT", "AIC", "ARC", "RC"],
    required: true,
    product: true,
  },
  SOUP: { home: "DOC-090", parents: [], product: false },
  SUB: { home: "DOC-100", parents: [], product: false },
  IT: { home: "DOC-100", parents: [], product: false },
  ADR: { home: "docs/adr", parents: [], product: false },
  REV: { home: "docs/reviews", parents: [], product: false },
  DOC: { home: "docs", parents: [], product: false },
};

/** Coverage rules: each item of `types` should have at least one child of `children`. */
export const COVERAGE = [
  { types: ["IU"], children: ["UN", "HAZ"], gap: "has no user need or hazard" },
  { types: ["UN"], children: ["SYS", "SEC", "DAT"], gap: "has no requirement" },
  { types: ["HAZ"], children: ["RC"], gap: "has no risk control" },
  {
    types: ["RC"],
    children: ["SYS", "SEC", "DAT"],
    gap: "is not implemented by a requirement",
  },
  {
    types: ["SYS", "SEC", "DAT", "AIC"],
    children: ["TC"],
    gap: "has no test case",
  },
  {
    types: ["SYS"],
    children: ["ARC", "AIC"],
    gap: "is not allocated to the architecture",
  },
];

export const PRODUCTS = {
  Shared: [1, 99],
  Prepped: [100, 299],
  SpareWing: [300, 499],
};
const DOC_STATUSES = [
  "Draft",
  "In review",
  "Approved",
  "Superseded",
  "Obsolete",
];
const ADR_STATUSES = ["Proposed", "Accepted", "Superseded", "Rejected"];
const TESTABLE = ["TC", "SYS", "SEC", "DAT", "AIC", "ARC"];
const PREFIX_SOURCE = Object.keys(TYPES).join("|");
const ID = new RegExp(String.raw`\b(${PREFIX_SOURCE})-(\d{3})\b`, "g");
const MALFORMED = new RegExp(
  String.raw`\b(${PREFIX_SOURCE})-(\d{1,2}|\d{4,})\b`,
  "g",
);
const OWNER_DECISION = /\(owner, \d{4}-\d{2}-\d{2}\)/;
const GENERATED = /<!-- BEGIN GENERATED -->[\s\S]*?<!-- END GENERATED -->/;

export const prefixOf = (id) => id.slice(0, id.lastIndexOf("-"));
export const numberOf = (id) => Number(id.slice(id.lastIndexOf("-") + 1));

/** Natural order: by prefix, then by number. */
export function compareIds(a, b) {
  const pa = prefixOf(a);
  const pb = prefixOf(b);
  return pa === pb ? numberOf(a) - numberOf(b) : pa.localeCompare(pb);
}

/** Splits YAML-style front matter (simple `key: value` lines) from the body. */
export function parseFrontMatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (match === null) return { meta: null, body: text };
  const meta = {};
  for (const line of match[1].split("\n")) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  return { meta, body: text.slice(match[0].length) };
}

/** Text with generated sections removed, so that they never count as references or content. */
export const withoutGenerated = (text) =>
  text.replace(GENERATED, "<!-- BEGIN GENERATED -->\n<!-- END GENERATED -->");

/** Text with fenced code blocks and inline code blanked out (kept as empty lines, so line numbers hold). */
export const withoutCode = (text) =>
  text
    .replace(/^```[\s\S]*?^```$/gm, (block) => block.replace(/[^\n]/g, ""))
    .replace(/`[^`\n]*`/g, "``");

/** Reads the items defined in a document: `### PREFIX-nnn Title` followed by `- Field: value` lines. */
export function parseItems(text, source) {
  const items = [];
  const errors = [];
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    const heading = /^### (\S+)(?: (.*))?$/.exec(line);
    if (heading === null) return;
    const [, id, title = ""] = heading;
    if (!/^[A-Z]+-\d+$/.test(id)) return; // an ordinary heading
    if (!new RegExp(`^(${PREFIX_SOURCE})-\\d{3}$`).test(id)) {
      errors.push(
        `${source}:${index + 1}: "${id}" is not a valid item ID (PREFIX-nnn)`,
      );
      return;
    }
    const fields = {};
    for (let j = index + 1; j < lines.length; j += 1) {
      const field = /^- ([A-Z][A-Za-z -]*): (.*)$/.exec(lines[j]);
      if (field === null) break;
      fields[field[1]] = field[2].trim();
    }
    const body = [];
    for (
      let j = index + 1;
      j < lines.length && !/^#{1,3} /.test(lines[j]);
      j += 1
    ) {
      body.push(lines[j]);
    }
    items.push({
      id,
      title: title.trim(),
      fields,
      source,
      line: index + 1,
      text: body.join("\n"),
    });
  });
  return { items, errors };
}

const list = (value) =>
  (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

/** Loads the controlled set from files: [{ path, text }]. */
export function buildModel(files) {
  const errors = [];
  const warnings = [];
  const docs = [];
  const items = new Map();
  const define = (item) => {
    if (items.has(item.id)) {
      const first = items.get(item.id);
      errors.push(
        `${item.id} is defined twice (${first.source}:${first.line} and ${item.source}:${item.line})`,
      );
      return;
    }
    items.set(item.id, item);
  };

  for (const { path, text } of files) {
    const { meta, body } = parseFrontMatter(text);
    const name = basename(path);
    if (path.startsWith("docs/adr/") || path.startsWith("docs/reviews/")) {
      const kind = path.startsWith("docs/adr/") ? "ADR" : "REV";
      if (
        meta === null ||
        !new RegExp(`^${kind}-\\d{3}$`).test(meta.id ?? "")
      ) {
        errors.push(`${path}: needs front matter with id ${kind}-nnn`);
        continue;
      }
      if (!name.startsWith(`${meta.id}-`))
        errors.push(`${path}: file name must start with ${meta.id}-`);
      if (kind === "ADR") {
        if (!ADR_STATUSES.includes(meta.status)) {
          errors.push(
            `${path}: status must be one of ${ADR_STATUSES.join(", ")}`,
          );
        }
        if (
          meta.status === "Accepted" &&
          !/^owner, \d{4}-\d{2}-\d{2}$/.test(meta.decided ?? "")
        ) {
          errors.push(
            `${path}: an Accepted ADR needs "decided: owner, YYYY-MM-DD"`,
          );
        }
      }
      define({
        id: meta.id,
        title: meta.title ?? "",
        fields: { Status: meta.status ?? "", Decided: meta.decided ?? "" },
        source: path,
        line: 1,
        text: body,
      });
      docs.push({ kind, id: meta.id, path, meta, text });
      continue;
    }
    if (meta === null) {
      errors.push(`${path}: controlled documents need front matter`);
      continue;
    }
    if (!/^DOC-\d{3}$/.test(meta.id ?? ""))
      errors.push(`${path}: id must be DOC-nnn`);
    if (!name.startsWith(`${meta.id}-`))
      errors.push(`${path}: file name must start with ${meta.id}-`);
    if (!/^\d+\.\d+$/.test(meta.version ?? ""))
      errors.push(`${path}: version must look like 0.1 or 1.0`);
    if (!DOC_STATUSES.includes(meta.status))
      errors.push(`${path}: status must be one of ${DOC_STATUSES.join(", ")}`);
    if (
      meta.status === "Approved" &&
      !/^\d{4}-\d{2}-\d{2}$/.test(meta.effective_date ?? "")
    ) {
      errors.push(`${path}: an Approved document needs effective_date`);
    }
    const history = body.split(/^## Revision history$/m)[1];
    const rows = (history ?? "")
      .split("\n")
      .filter((l) => /^\| \d+\.\d+ \|/.test(l));
    const last = rows.at(-1)?.split("|")[1]?.trim();
    if (last !== meta.version) {
      errors.push(
        `${path}: the last revision history row must be for version ${meta.version} (found ${last ?? "none"})`,
      );
    }
    const tbd = (withoutGenerated(body).match(/\bTBD\b/g) ?? []).length;
    docs.push({ kind: "DOC", id: meta.id, path, meta, text, tbd });
    define({
      id: meta.id,
      title: meta.title ?? "",
      fields: {},
      source: path,
      line: 1,
      text: "",
    });
    const parsed = parseItems(withoutCode(withoutGenerated(body)), path);
    errors.push(...parsed.errors);
    for (const item of parsed.items) {
      const type = prefixOf(item.id);
      if (TYPES[type].home !== meta.id) {
        errors.push(
          `${item.source}:${item.line}: ${item.id} must be defined in ${TYPES[type].home}, not ${meta.id}`,
        );
      }
      define(item);
    }
  }

  for (const item of items.values()) {
    item.type = prefixOf(item.id);
    item.traces = list(item.fields["Traces to"]);
    item.formerly = list(item.fields.Formerly);
    item.safetyCritical = /^yes$/i.test(item.fields["Safety-critical"] ?? "");
  }
  return { docs, items, errors, warnings };
}

/** Checks references, traces, ranges, aliases and open decisions. */
export function checkModel(model, { strict = false } = {}) {
  const { items, docs } = model;
  const errors = [...model.errors];
  const warnings = [...model.warnings];
  const aliases = new Map();

  for (const doc of docs) {
    const text = withoutCode(withoutGenerated(doc.text));
    const lines = text.split("\n");
    lines.forEach((line, index) => {
      for (const match of line.matchAll(ID)) {
        if (!items.has(match[0]))
          errors.push(
            `${doc.path}:${index + 1}: ${match[0]} is referenced but never defined`,
          );
      }
      for (const match of line.matchAll(MALFORMED)) {
        errors.push(
          `${doc.path}:${index + 1}: "${match[0]}" is not a valid ID (use three digits)`,
        );
      }
    });
    if (doc.kind === "DOC" && doc.meta.status === "Approved" && doc.tbd > 0) {
      errors.push(
        `${doc.path}: an Approved document must not contain TBD (${doc.tbd} found)`,
      );
    }
  }

  for (const item of items.values()) {
    const rule = TYPES[item.type];
    if (rule.product) {
      const product = item.fields.Product;
      const range = PRODUCTS[product];
      if (range === undefined) {
        errors.push(
          `${item.source}:${item.line}: ${item.id} needs "Product: Shared, Prepped or SpareWing"`,
        );
      } else if (numberOf(item.id) < range[0] || numberOf(item.id) > range[1]) {
        errors.push(
          `${item.source}:${item.line}: ${item.id} is outside the ${product} range ${range[0]}-${range[1]}`,
        );
      }
    }
    for (const parent of item.traces) {
      if (!items.has(parent))
        errors.push(`${item.id} traces to ${parent}, which is not defined`);
      else if (!rule.parents.includes(prefixOf(parent))) {
        errors.push(
          `${item.id} traces to ${parent}; ${item.type} may trace only to ${rule.parents.join(", ") || "nothing"}`,
        );
      }
    }
    if (rule.required && item.traces.length === 0)
      errors.push(`${item.id} must trace to ${rule.parents.join(" or ")}`);
    if (
      rule.mustInclude &&
      !item.traces.some((p) => prefixOf(p) === rule.mustInclude)
    ) {
      errors.push(`${item.id} must trace to at least one ${rule.mustInclude}`);
    }
    for (const alias of item.formerly) {
      if (new RegExp(`^(${PREFIX_SOURCE})-\\d{3}$`).test(alias)) {
        errors.push(
          `${item.id}: "${alias}" in Formerly looks like a current ID`,
        );
      } else if (aliases.has(alias)) {
        errors.push(
          `${item.id}: alias ${alias} is already used by ${aliases.get(alias)}`,
        );
      } else aliases.set(alias, item.id);
    }
    if (item.type === "OD") {
      const status = item.fields.Status;
      if (!["Open", "Closed"].includes(status))
        errors.push(`${item.id} needs "Status: Open" or "Status: Closed"`);
      if (
        !/^(submission|real-world use|none)(, (submission|real-world use|none))*$/.test(
          item.fields.Blocks ?? "",
        )
      ) {
        errors.push(
          `${item.id} needs "Blocks: submission, real-world use or none"`,
        );
      }
      if (
        status === "Closed" &&
        !OWNER_DECISION.test(item.fields.Decision ?? "")
      ) {
        errors.push(
          `${item.id} is closed without a "Decision:" recorded as (owner, YYYY-MM-DD)`,
        );
      }
      if (
        strict &&
        status === "Open" &&
        /submission/.test(item.fields.Blocks ?? "")
      ) {
        errors.push(`${item.id} is open and blocks the submission`);
      }
    }
  }

  // Children of each item, from the trace links.
  const children = new Map([...items.keys()].map((id) => [id, []]));
  for (const item of items.values()) {
    for (const parent of item.traces) children.get(parent)?.push(item.id);
  }
  const gaps = [];
  for (const rule of COVERAGE) {
    for (const item of items.values()) {
      if (!rule.types.includes(item.type) || item.fields.Status === "Retired")
        continue;
      const found = children
        .get(item.id)
        .some((c) => rule.children.includes(prefixOf(c)));
      if (!found) gaps.push(`${item.id} ${rule.gap}`);
    }
  }
  (strict ? errors : warnings).push(...gaps);
  return { errors, warnings, gaps, children };
}

/** Finds tests: every title starts with the IDs it verifies, e.g. it('[TC-101] Given ...'). */
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
          `${where}: test title must start with the IDs it verifies, e.g. "[TC-101] ..."`,
        );
        continue;
      }
      const ids = tag[1].split(/[\s,]+/).filter(Boolean);
      const status =
        modifier === "todo"
          ? "placeholder"
          : modifier === "skip"
            ? "skipped"
            : "implemented";
      tests.push({ where, path, ids, status });
    }
  }
  return { tests, errors };
}

/** Joins tests to items: unknown tags, TCs without tests, and (strict) unfinished safety-critical work. */
export function checkTests(model, scanned, { strict = false } = {}) {
  const errors = [...scanned.errors];
  const byId = new Map();
  for (const test of scanned.tests) {
    for (const id of test.ids) {
      if (!model.items.has(id))
        errors.push(
          `${test.where}: ${id} is not defined in the controlled documents`,
        );
      else if (!TESTABLE.includes(prefixOf(id)))
        errors.push(`${test.where}: ${id} is not a testable item`);
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id).push(test);
    }
  }
  const statusOf = (id) => {
    const tests = byId.get(id) ?? [];
    if (tests.length === 0) return "missing";
    return tests.every((t) => t.status === "implemented")
      ? "implemented"
      : "placeholder";
  };
  for (const item of model.items.values()) {
    if (item.type !== "TC" || item.fields.Status === "Retired") continue;
    const status = statusOf(item.id);
    if (status === "missing")
      errors.push(
        `${item.id} has no test (add at least an it.todo placeholder)`,
      );
    if (strict && status === "placeholder")
      errors.push(`${item.id} is still a placeholder or skipped`);
  }
  return { errors, byId, statusOf };
}

/** Reads docs/SUBMISSION.md lines "- [ ] SUB-001 ..." and checks them against the SUB items. */
export function checkSubmission(model, text, { strict = false } = {}) {
  const errors = [];
  const ticked = new Map();
  for (const line of (text ?? "").split("\n")) {
    const match = /^- \[([ xX])\] (SUB-\d{3})\b/.exec(line);
    if (match === null) continue;
    if (ticked.has(match[2]))
      errors.push(`docs/SUBMISSION.md lists ${match[2]} twice`);
    ticked.set(match[2], match[1] !== " ");
  }
  for (const item of model.items.values()) {
    if (item.type !== "SUB") continue;
    if (!ticked.has(item.id))
      errors.push(`${item.id} is missing from docs/SUBMISSION.md`);
    else if (strict && !ticked.get(item.id))
      errors.push(`${item.id} is not ticked in docs/SUBMISSION.md`);
  }
  for (const id of ticked.keys()) {
    if (!model.items.has(id))
      errors.push(`docs/SUBMISSION.md lists ${id}, which is not defined`);
  }
  return { errors, ticked };
}

/** Strict only: every safety-critical requirement needs an implemented test case. */
export function checkSafetyCritical(model, coverage, tests) {
  const errors = [];
  for (const item of model.items.values()) {
    if (!item.safetyCritical || !["SYS", "ARC"].includes(item.type)) continue;
    const tcs = coverage.children
      .get(item.id)
      .filter((c) => prefixOf(c) === "TC");
    const direct = tests.statusOf(item.id) === "implemented";
    if (!direct && !tcs.some((tc) => tests.statusOf(tc) === "implemented")) {
      errors.push(`${item.id} is safety-critical and has no implemented test`);
    }
  }
  return errors;
}

/** Compares document versions with a base revision: content changed means version changed. */
export function versionBumpErrors(changes) {
  const errors = [];
  for (const { path, before, after } of changes) {
    if (before === null || after === null) continue;
    const a = parseFrontMatter(withoutGenerated(before));
    const b = parseFrontMatter(withoutGenerated(after));
    if (a.meta === null || b.meta === null) continue;
    const contentChanged =
      a.body !== b.body ||
      JSON.stringify({ ...a.meta, version: "" }) !==
        JSON.stringify({ ...b.meta, version: "" });
    if (contentChanged && a.meta.version === b.meta.version) {
      errors.push(
        `${path} changed without a version bump (still ${b.meta.version})`,
      );
    }
    if (
      path.startsWith("docs/adr/") &&
      a.meta.status === "Accepted" &&
      a.body !== b.body
    ) {
      errors.push(
        `${path} is Accepted and must not be edited; supersede it with a new ADR`,
      );
    }
  }
  return errors;
}

const cell = (value) =>
  value === undefined || value === ""
    ? "–"
    : String(value).replaceAll("|", "\\|");
const row = (cells) => `| ${cells.map(cell).join(" | ")} |`;
const table = (header, rows) =>
  [row(header), row(header.map(() => "---")), ...rows.map(row)].join("\n");

/** Builds the four generated sections. Deterministic: no dates or timings. */
export function renderGenerated(model, coverage, tests) {
  const items = [...model.items.values()].sort((a, b) =>
    compareIds(a.id, b.id),
  );
  const of = (type) => items.filter((i) => i.type === type);
  const kids = (id, types) =>
    coverage.children
      .get(id)
      .filter((c) => types.includes(prefixOf(c)))
      .sort(compareIds);
  const docs = model.docs
    .filter((d) => d.kind === "DOC")
    .sort((a, b) => compareIds(a.id, b.id));
  const adrs = model.docs
    .filter((d) => d.kind === "ADR")
    .sort((a, b) => compareIds(a.id, b.id));

  const counts = Object.keys(TYPES)
    .filter((t) => !["DOC"].includes(t))
    .map((t) => [t, of(t).length])
    .filter(([, n]) => n > 0);
  const index = [
    table(
      ["ID", "Title", "Version", "Status", "File"],
      docs.map((d) => [
        d.id,
        d.meta.title,
        d.meta.version,
        d.meta.status,
        `\`${d.path}\``,
      ]),
    ),
    "",
    "Items defined, by type:",
    "",
    table(["Type", "Count"], counts),
  ].join("\n");

  const openOd = of("OD").filter((o) => o.fields.Status === "Open");
  const blockers = openOd.filter((o) => /submission/.test(o.fields.Blocks));
  const realWorld = openOd.filter((o) =>
    /real-world use/.test(o.fields.Blocks),
  );
  const decisions = [
    `Open decisions: ${openOd.length} of ${of("OD").length}. Release blockers for the submission: ${blockers.length}. Blocking real-world use: ${realWorld.length}.`,
    "",
    "**Release blockers (submission):**",
    "",
    table(
      ["ID", "Decision needed", "Affects"],
      blockers.map((o) => [o.id, o.title, o.fields.Affects]),
    ),
  ].join("\n");

  const adrIndex = table(
    ["ID", "Title", "Status", "Decided"],
    adrs.map((a) => [a.id, a.meta.title, a.meta.status, a.meta.decided]),
  );

  const tcStatus = (id) =>
    ({
      implemented: "Implemented",
      placeholder: "Placeholder",
      missing: "Missing",
    })[tests.statusOf(id)];
  const files = (id) =>
    [...new Set((tests.byId.get(id) ?? []).map((t) => `\`${t.path}\``))].join(
      ", ",
    );
  const testsFor = (id) =>
    kids(id, ["TC"])
      .map((tc) => `${tc} (${tcStatus(tc)})`)
      .join(", ");
  const matrix = [
    "## Summary",
    "",
    table(
      ["Measure", "Count"],
      [
        [
          "Test cases implemented",
          `${of("TC").filter((t) => tests.statusOf(t.id) === "implemented").length} of ${of("TC").length}`,
        ],
        [
          "Safety-critical requirements",
          items.filter((i) => i.safetyCritical && i.type === "SYS").length,
        ],
        ["Coverage gaps", coverage.gaps.length],
        ["Open decisions blocking submission", blockers.length],
      ],
    ),
    "",
    "## User needs to requirements",
    "",
    table(
      ["User need", "Traces to", "Requirements"],
      of("UN").map((u) => [
        u.id,
        u.traces.join(", "),
        kids(u.id, ["SYS", "SEC", "DAT"]).join(", "),
      ]),
    ),
    "",
    "## Hazards to risk controls",
    "",
    table(
      ["Hazard", "Risk control", "Implemented by", "Test cases"],
      of("RC").map((rc) => {
        const impl = kids(rc.id, ["SYS", "SEC", "DAT"]);
        const tcs = [...new Set(impl.flatMap((r) => kids(r, ["TC"])))].sort(
          compareIds,
        );
        return [rc.traces.join(", "), rc.id, impl.join(", "), tcs.join(", ")];
      }),
    ),
    "",
    "## Requirements to architecture and tests",
    "",
    table(
      [
        "Requirement",
        "Product",
        "Safety-critical",
        "Traces to",
        "Allocated to",
        "Test cases",
      ],
      items
        .filter((i) => ["SYS", "SEC", "DAT", "AIC"].includes(i.type))
        .map((i) => [
          i.id,
          i.fields.Product,
          i.safetyCritical ? "yes" : "",
          i.traces.join(", "),
          kids(i.id, ["ARC", "AIC"]).join(", "),
          testsFor(i.id),
        ]),
    ),
    "",
    "## Test cases",
    "",
    table(
      ["Test case", "Traces to", "Test file", "Status"],
      of("TC").map((t) => [
        t.id,
        t.traces.join(", "),
        files(t.id),
        tcStatus(t.id),
      ]),
    ),
    "",
    "## Coverage gaps",
    "",
    coverage.gaps.length === 0
      ? "None."
      : coverage.gaps.map((g) => `- ${g}`).join("\n"),
  ].join("\n");

  return {
    "DOC-001": index,
    "DOC-003": decisions,
    "DOC-050": adrIndex,
    "DOC-080": matrix,
  };
}

/** Puts generated content between the markers. */
export function replaceGenerated(text, content) {
  return text.replace(
    GENERATED,
    `<!-- BEGIN GENERATED -->\n${content}\n<!-- END GENERATED -->`,
  );
}

function listFiles(
  dir,
  pattern,
  skip = new Set(["node_modules", ".git", "coverage", "dist"]),
) {
  const found = [];
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...listFiles(full, pattern, skip));
    else if (pattern.test(entry.name)) found.push(full);
  }
  return found.sort();
}

function main(args) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const rel = (full) => relative(root, full).split(sep).join("/");
  const strict = args.includes("--strict");
  const update = args.includes("--update");
  const baseIndex = args.indexOf("--base");
  const base = baseIndex >= 0 ? args[baseIndex + 1] : null;

  const docPaths = [
    ...listFiles(
      join(root, "docs"),
      /^DOC-\d{3}-.*\.md$/,
      new Set(["adr", "reviews"]),
    ),
    ...listFiles(join(root, "docs", "adr"), /^ADR-.*\.md$/),
    ...listFiles(join(root, "docs", "reviews"), /^REV-.*\.md$/),
  ];
  const read = (full) => ({
    path: rel(full),
    text: readFileSync(full, "utf8"),
  });
  let files = docPaths.map(read);
  let model = buildModel(files);
  const testFiles = ["packages", "apps"]
    .flatMap((d) => listFiles(join(root, d), /\.test\.(?:ts|tsx|js|mjs)$/))
    .map(read);
  const scanned = scanTests(testFiles);
  let coverage = checkModel(model, { strict });
  let tests = checkTests(model, scanned, { strict });

  const generated = renderGenerated(model, coverage, tests);
  const errors = [];
  for (const doc of model.docs) {
    const content = generated[doc.id];
    if (content === undefined) continue;
    const next = replaceGenerated(doc.text, content);
    if (next === doc.text) continue;
    if (update) writeFileSync(join(root, doc.path), next);
    else
      errors.push(
        `${doc.path}: generated section is out of date (run pnpm docs:update)`,
      );
  }
  if (update) {
    files = docPaths.map(read);
    model = buildModel(files);
    coverage = checkModel(model, { strict });
    tests = checkTests(model, scanned, { strict });
  }

  errors.push(...coverage.errors, ...tests.errors);
  const submissionPath = join(root, "docs", "SUBMISSION.md");
  errors.push(
    ...checkSubmission(
      model,
      existsSync(submissionPath) ? readFileSync(submissionPath, "utf8") : "",
      { strict },
    ).errors,
  );
  if (strict) errors.push(...checkSafetyCritical(model, coverage, tests));

  if (base !== null) {
    const changed = execFileSync(
      "git",
      ["diff", "--name-only", base, "--", "docs"],
      { cwd: root, encoding: "utf8" },
    )
      .split("\n")
      .filter((p) => /^docs\/(adr\/ADR-|DOC-).*\.md$/.test(p));
    const show = (path) => {
      try {
        return execFileSync("git", ["show", `${base}:${path}`], {
          cwd: root,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        });
      } catch {
        return null;
      }
    };
    const changes = changed.map((path) => ({
      path,
      before: show(path),
      after: existsSync(join(root, path))
        ? readFileSync(join(root, path), "utf8")
        : null,
    }));
    errors.push(...versionBumpErrors(changes));
  }

  for (const warning of coverage.warnings)
    process.stdout.write(`warning: ${warning}\n`);
  for (const error of errors) process.stderr.write(`error: ${error}\n`);
  const tbd = model.docs.reduce((n, d) => n + (d.tbd ?? 0), 0);
  const open = [...model.items.values()].filter(
    (i) => i.type === "OD" && i.fields.Status === "Open",
  );
  const blockers = open.filter((o) => /submission/.test(o.fields.Blocks));
  process.stdout.write(
    `${model.docs.filter((d) => d.kind === "DOC").length} documents, ${model.items.size} IDs, ` +
      `${coverage.warnings.length} warnings, ${errors.length} errors${strict ? " (strict)" : ""}. ` +
      `TBD: ${tbd}. Open decisions: ${open.length} (${blockers.length} block the submission).` +
      `${update ? " Generated sections updated." : ""}\n`,
  );
  process.exitCode = errors.length > 0 ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2));
}
