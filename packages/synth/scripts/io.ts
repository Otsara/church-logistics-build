/** File helpers shared by the data scripts. */
import { createHash } from "node:crypto";
import { join } from "node:path";

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
