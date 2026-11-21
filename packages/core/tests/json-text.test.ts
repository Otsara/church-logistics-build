// Reading JSON text so that a key named twice is caught, not silently dropped (ADR-034).
import { describe, expect, it } from "vitest";
import * as core from "../src/index.ts";
import { readJsonText } from "../src/json-text.ts";

const dup = (key: string, path: string): string =>
  `duplicate key "${key}" in ${path}: the later entry would silently replace the earlier one`;

describe("JSON text with duplicate keys", () => {
  it("[TC-328] Given valid JSON with no repeated key, then it is read as JSON.parse reads it, whatever the whitespace, nesting, escapes and values", () => {
    const source =
      '{\r\n\t"a": [1, -2.5e3, true, false, null, "x\\"y", {"b": {}}, []],\n "c\\"d": {"e": "]}", "f": [ {"g": 1}, {"g": 2} ] } ,"h":{}}';
    expect(readJsonText(source)).toEqual({
      ok: true,
      json: JSON.parse(source) as unknown,
    });
    expect(readJsonText(" [ ] ")).toEqual({ ok: true, json: [] });
    // Space before and after every colon, comma and bracket.
    const spaced = '{ "a" : [ 1 , { } , [ ] ] , "b" : { "c" : 2 } , "a2" : 3 }';
    expect(readJsonText(spaced)).toEqual({
      ok: true,
      json: JSON.parse(spaced) as unknown,
    });
    expect(readJsonText('{ "a" : 1 , "a" : 2 }')).toEqual({
      ok: false,
      errors: [dup("a", "(file)")],
    });
    expect(readJsonText("12")).toEqual({ ok: true, json: 12 });
    expect(readJsonText('"text"')).toEqual({ ok: true, json: "text" });
  });

  it("[TC-328] Given a key repeated in any object, at any depth, then every repeat is listed with where it is", () => {
    expect(
      readJsonText(
        '{"a": 1, "a": 2, "b": {"c": [{"d": 1, "d": 2}], "e\\"f": 1, "e\\"f": 2}, "a": 3}',
      ),
    ).toEqual({
      ok: false,
      errors: [
        dup("a", "(file)"),
        dup("d", "b.c.0"),
        dup('e"f', "b"),
        dup("a", "(file)"),
      ],
    });
    // A space before the comma does not shift the position named.
    expect(readJsonText('[{"x": 1} , {"y": 1, "y": 2}]')).toEqual({
      ok: false,
      errors: [dup("y", "(file).1")],
    });
    expect(readJsonText('[{"x": 1}, {"y": 1, "y": 2}]')).toEqual({
      ok: false,
      errors: [dup("y", "(file).1")],
    });
  });

  it("[TC-328] Given text that is not JSON, then it is refused", () => {
    for (const bad of ["", "{", '{"a": 1,}', "{'a': 1}"]) {
      expect(readJsonText(bad), bad).toEqual({
        ok: false,
        errors: ["not valid JSON"],
      });
    }
  });

  it("[TC-328] Given a screen that reads a rule file, then the reader is available from core's main entry, so no screen falls back to JSON.parse", () => {
    expect(core.readJsonText).toBe(readJsonText);
  });
});
