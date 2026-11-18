#!/usr/bin/env node
// Builds the rules folder the screens import (ARC-003; owner, 2026-11-18; ADR-046, ADR-048).
//
//   node tools/rules-bundle.mjs <out-dir>            write the folder
//   node tools/rules-bundle.mjs --check <dir>        exit 1 if <dir> differs from a fresh build
//
// The folder holds exact copies of the source files the screens need, found by following the
// imports from the core rules and the browser-safe AI entry point, each stamped as generated; the
// rule files as text; an index; and a manifest of every file's SHA-256. Nobody edits it by hand:
// change the source here and build it again. Only "zod" may be imported from outside the folder,
// so no server code, key or other package reaches a browser (SEC-001).

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = {
  core: join(ROOT, "packages/core/src"),
  ai: join(ROOT, "packages/ai/src"),
};
const ENTRIES = [join(SOURCES.core, "index.ts"), join(SOURCES.ai, "client.ts")];
const RULE_DIRS = ["prepped", "sparewing"];
const ALLOWED_PACKAGES = new Set(["zod"]);
const IMPORT = /(?:^|\n)\s*(?:import|export)\b[^;]*?\bfrom\s+"([^"]+)"/g;

const posix = (path) => path.split(sep).join("/");

/** The commit the folder is built from, or "uncommitted" outside a git checkout. */
function commit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    return "uncommitted";
  }
}

/** The output path of a source file: core/... or ai/... */
function outPath(file) {
  for (const [name, dir] of Object.entries(SOURCES)) {
    if (file.startsWith(dir + sep))
      return posix(join(name, relative(dir, file)));
  }
  throw new Error(`${file} is outside the packages the screens may use`);
}

/** Every source file reachable from the entries, with its imports checked. */
export function reachableFiles() {
  const seen = new Set();
  const queue = [...ENTRIES];
  const problems = [];
  while (queue.length > 0) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    const text = readFileSync(file, "utf8");
    for (const [, spec] of text.matchAll(IMPORT)) {
      if (spec.startsWith(".")) queue.push(resolve(dirname(file), spec));
      else if (spec === "@church-logistics/core")
        queue.push(join(SOURCES.core, "index.ts"));
      else if (!ALLOWED_PACKAGES.has(spec))
        problems.push(`${posix(relative(ROOT, file))} imports "${spec}"`);
    }
  }
  if (problems.length > 0)
    throw new Error(
      `not allowed in the screens' rules:\n${problems.join("\n")}`,
    );
  return [...seen].sort();
}

/** The header stamped on every generated source file. */
const header = (source, sha) =>
  `// Generated from Otsara/church-logistics-build ${sha}, ${source}, by tools/rules-bundle.mjs.\n// Do not edit: change the source and build the folder again (ADR-046).\n`;

/** Builds the folder's files in memory: path -> text. */
export function buildFiles(sha = commit()) {
  const files = new Map();
  for (const file of reachableFiles()) {
    const out = outPath(file);
    let text = readFileSync(file, "utf8");
    // The AI package reaches core by package name; in the folder it is a relative path.
    const toCore = posix(relative(dirname(join("/", out)), "/core/index.ts"));
    text = text.replaceAll(
      '"@church-logistics/core"',
      `"${toCore.startsWith(".") ? toCore : `./${toCore}`}"`,
    );
    files.set(out, header(posix(relative(ROOT, file)), sha) + text);
  }
  const ruleTexts = {};
  for (const dir of RULE_DIRS) {
    for (const name of readdirSync(join(ROOT, "rules", dir)).sort()) {
      if (name.endsWith(".json"))
        ruleTexts[`${dir}/${name}`] = readFileSync(
          join(ROOT, "rules", dir, name),
          "utf8",
        );
    }
  }
  files.set(
    "rule-files.ts",
    header("rules/", sha) +
      "/** Each rule file's text, keyed by its path under rules/; read it with the core readers. */\n" +
      `export const RULE_FILES: Readonly<Record<string, string>> = ${JSON.stringify(ruleTexts, null, 2)};\n`,
  );
  files.set(
    "index.ts",
    header("packages/core/src/index.ts and packages/ai/src/client.ts", sha) +
      'export * from "./core/index.ts";\nexport * from "./ai/client.ts";\nexport { RULE_FILES } from "./rule-files.ts";\n',
  );
  const manifest = {
    source: "Otsara/church-logistics-build",
    commit: sha,
    files: Object.fromEntries(
      [...files].map(([path, text]) => [
        path,
        createHash("sha256").update(text).digest("hex"),
      ]),
    ),
  };
  files.set("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
  return files;
}

/** Writes the folder, replacing what was there. */
export function writeFolder(dir, files) {
  rmSync(dir, { recursive: true, force: true });
  for (const [path, text] of files) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
}

/** Every file under a folder, as path -> text. */
function readFolder(dir) {
  const files = new Map();
  const walk = (sub) => {
    for (const entry of readdirSync(join(dir, sub), { withFileTypes: true })) {
      const path = sub === "" ? entry.name : `${sub}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else files.set(path, readFileSync(join(dir, path), "utf8"));
    }
  };
  walk("");
  return files;
}

/** The differences between a folder and a fresh build from the commit it names. */
export function compareFolder(dir) {
  const existing = readFolder(dir);
  const manifest = JSON.parse(existing.get("manifest.json") ?? "{}");
  const fresh = buildFiles(manifest.commit ?? commit());
  const problems = [];
  for (const [path, text] of fresh) {
    if (!existing.has(path)) problems.push(`missing: ${path}`);
    else if (existing.get(path) !== text) problems.push(`differs: ${path}`);
  }
  for (const path of existing.keys())
    if (!fresh.has(path)) problems.push(`not generated: ${path}`);
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] === "--check" && args[1]) {
    const problems = compareFolder(resolve(args[1]));
    if (problems.length > 0) {
      console.error(
        `The rules folder does not match the source:\n${problems.join("\n")}`,
      );
      process.exit(1);
    }
    console.log("The rules folder matches the source.");
  } else if (args.length === 1 && !args[0].startsWith("--")) {
    const files = buildFiles();
    writeFolder(resolve(args[0]), files);
    console.log(`${files.size} files written to ${args[0]}`);
  } else {
    console.error("usage: rules-bundle.mjs <out-dir> | --check <dir>");
    process.exit(2);
  }
}
