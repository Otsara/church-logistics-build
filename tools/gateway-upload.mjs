// Packages the AI gateway Edge Function for upload to Supabase (ARC-014). Supabase's upload needs
// every file inside the function's own folder, while the function reuses tested code from
// packages/ai. This copies that code in unchanged and rewrites only the import paths in index.ts
// and deno.json. Usage: node tools/gateway-upload.mjs <out-dir>
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const FUNCTION = "supabase/functions/ai-gateway";

/** Upload name -> repository path, copied unchanged. */
export const SOURCES = {
  "ai/gateway.ts": "packages/ai/src/gateway.ts",
  "ai/anthropic.ts": "packages/ai/src/anthropic.ts",
  "ai/limits.ts": "packages/ai/src/limits.ts",
  "ai/step.ts": "packages/ai/src/step.ts",
  // step.ts needs only the AuditEntry type, which audit.ts defines without imports.
  "core/audit.ts": "packages/core/src/audit.ts",
  "deno.lock": `${FUNCTION}/deno.lock`,
};

const RELATIVE_IMPORT = /from\s+["']\.\.\//;

/** The files to upload, as { name, content }. Throws if any import would still leave the folder. */
export function uploadFiles(root = ".") {
  const read = (path) => readFileSync(join(root, path), "utf8");
  const index = read(`${FUNCTION}/index.ts`).replaceAll(
    "../../../packages/ai/src/",
    "./ai/",
  );
  const deno = JSON.parse(read(`${FUNCTION}/deno.json`));
  deno.imports["@church-logistics/core"] = "./core/audit.ts";
  const files = [
    { name: "index.ts", content: index },
    { name: "deno.json", content: `${JSON.stringify(deno, null, 2)}\n` },
    ...Object.entries(SOURCES).map(([name, path]) => ({
      name,
      content: read(path),
    })),
  ];
  for (const { name, content } of files) {
    if (RELATIVE_IMPORT.test(content)) {
      throw new Error(`${name} still imports from outside the function folder`);
    }
  }
  if (/^import /m.test(read(SOURCES["core/audit.ts"]))) {
    throw new Error("core/audit.ts gained imports; package them too");
  }
  return files;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2];
  if (out === undefined) {
    process.stderr.write("usage: node tools/gateway-upload.mjs <out-dir>\n");
    process.exit(1);
  }
  for (const { name, content } of uploadFiles()) {
    mkdirSync(dirname(join(out, name)), { recursive: true });
    writeFileSync(join(out, name), content);
  }
  process.stdout.write(`AI gateway upload written to ${out}\n`);
}
