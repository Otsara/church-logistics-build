/** File helpers shared by the data scripts. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseRuleFile } from "@church-logistics/core";
import { routeScopeSchema, type RouteScopeRules } from "../src/fda.ts";

export const ROOT = join(import.meta.dirname, "../../..");

export const sha256 = (data: string | Buffer): string =>
  createHash("sha256").update(data).digest("hex");

/** JSON with one array element per line, so large data files stay readable and diffable. */
export function linedJson(
  head: Record<string, unknown>,
  key: string,
  items: readonly unknown[],
): string {
  const top = JSON.stringify(head, null, 2).replace(/\n}$/, "");
  const body = items.map((i) => JSON.stringify(i)).join(",\n");
  return `${top},\n  ${JSON.stringify(key)}: [\n${body}\n]\n}\n`;
}

/** The route rule file; it must be verified by the owner before data is built from it. */
export function readRouteScope(): RouteScopeRules {
  const raw: unknown = JSON.parse(
    readFileSync(join(ROOT, "rules/prepped/route-scope.json"), "utf8"),
  );
  const file = parseRuleFile(raw);
  if (!file.ok) throw new Error(file.errors.join("\n"));
  if ((raw as { status?: unknown }).status !== "verified")
    throw new Error("rules/prepped/route-scope.json is not verified");
  return routeScopeSchema.parse(file.file.data);
}
