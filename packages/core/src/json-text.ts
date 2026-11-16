/**
 * Reading a rule file's JSON text (ARC-004; safety-critical). `JSON.parse` keeps only the last of
 * two entries with the same key, so a rule named twice would be silently replaced. This reads the
 * text, and refuses it when any object names a key twice, listing each repeat and where it is
 * (owner, 2026-11-16; ADR-034). Never throws.
 */

export type JsonText =
  | { readonly ok: true; readonly json: unknown }
  | { readonly ok: false; readonly errors: readonly string[] };

/** JSON's whitespace. Past the end of the text, charAt gives "", which matches neither set. */
const SPACE = /[ \t\n\r]/;
const VALUE_END = /[,\]} \t\n\r]/;

/** Lists every repeated key in text that `JSON.parse` has already accepted. */
function repeatedKeys(text: string): string[] {
  const errors: string[] = [];
  let i = 0;
  const skipSpace = (): void => {
    while (SPACE.test(text.charAt(i))) i += 1;
  };
  const readString = (): string => {
    const start = i;
    i += 1;
    while (text.charAt(i) !== '"') i += text.charAt(i) === "\\" ? 2 : 1;
    i += 1;
    return JSON.parse(text.slice(start, i)) as string;
  };
  const readValue = (path: string): void => {
    skipSpace();
    const first = text.charAt(i);
    if (first === "{") {
      i += 1;
      skipSpace();
      const seen = new Set<string>();
      while (text.charAt(i) !== "}") {
        skipSpace();
        const key = readString();
        if (seen.has(key)) {
          errors.push(
            `duplicate key "${key}" in ${path}: the later entry would silently replace the earlier one`,
          );
        }
        seen.add(key);
        skipSpace();
        i += 1; // the colon
        readValue(path === "(file)" ? key : `${path}.${key}`);
        skipSpace();
        if (text.charAt(i) === ",") i += 1;
      }
      i += 1;
    } else if (first === "[") {
      i += 1;
      skipSpace();
      for (let n = 0; text.charAt(i) !== "]"; n += 1) {
        readValue(`${path}.${String(n)}`);
        skipSpace();
        if (text.charAt(i) === ",") i += 1;
      }
      i += 1;
    } else if (first === '"') {
      readString();
    } else {
      while (text.charAt(i) !== "" && !VALUE_END.test(text.charAt(i))) i += 1;
    }
  };
  readValue("(file)");
  return errors;
}

/** Reads JSON text, refusing invalid JSON and any key named twice in one object. */
export function readJsonText(text: string): JsonText {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["not valid JSON"] };
  }
  const errors = repeatedKeys(text);
  return errors.length > 0 ? { ok: false, errors } : { ok: true, json };
}
