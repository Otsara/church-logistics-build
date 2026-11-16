// The line checks behind both AI readers (ARC-008; SYS-119, SYS-313), after the owner's review
// (owner, 2026-11-16; REV-010, ADR-036): copies must be whole words, are kept as printed in the
// line, and a quantity also written as a strength sends the line to review.
import { describe, expect, it } from "vitest";
import {
  findCode,
  findIn,
  keepCode,
  keepNumber,
  keepText,
  matchLines,
} from "../src/steps/lines.ts";

const LINE =
  "Amoxicillin 500 mg CAPSULE x120 lot L123456 exp 06/2028 Maker: Synthetic Labs";

describe("Line checks after review", () => {
  it("[SYS-119] Given a copy that is only part of a word or number in the line, then it is not found; a whole word or run of words is", () => {
    for (const partial of [
      "L1234",
      "Amox",
      "06/202",
      "123456",
      "Synthetic Lab",
      "mg CAPS",
    ]) {
      expect(findIn(LINE, partial), partial).toBeNull();
    }
    for (const whole of [
      "L123456",
      "Amoxicillin",
      "06/2028",
      "500 mg",
      "Synthetic Labs",
      "x120",
    ]) {
      expect(findIn(LINE, whole), whole).toBe(whole);
    }
    // Punctuation at either end is matched as written, and blank copies never match.
    expect(findIn("Lot: (A-1) ok", "(A-1)")).toBe("(A-1)");
    expect(findIn(LINE, "   ")).toBeNull();
    expect(findIn("Paracetamol - 500 mg", "   ")).toBeNull();
    // Spaces around a copy are not part of it.
    expect(findIn(LINE, "  L123456 ")).toBe("L123456");
  });

  it("[SYS-119] Given a copy that differs only in letter case or spacing, then the line's own text is kept, never the AI's spelling", () => {
    expect(findIn(LINE, "l123456")).toBe("L123456");
    expect(findIn(LINE, "synthetic   labs")).toBe("Synthetic Labs");
    const reasons: string[] = [];
    expect(keepText(LINE, "lot number", "l123456", reasons)).toBe("L123456");
    expect(keepText(LINE, "lot number", "L1234", reasons)).toBeNull();
    expect(reasons).toEqual([
      'lot number "L1234" is not written in the line: left empty',
    ]);
  });

  it("[SYS-119] Given a quantity that is also written as a strength, then it is kept but the line needs review; a count written only as a count is not flagged", () => {
    const flagged: string[] = [];
    expect(keepNumber(LINE, 500, flagged)).toBe(500);
    expect(flagged).toEqual([
      'quantity "500" is also written as a strength ("500 mg"): check',
    ]);
    for (const [line, quantity] of [
      [LINE, 120],
      ["Glycerin 1800 mg/1 SUPPOSITORY x18", 18],
      ["Cream 1 g/100g, 384 units", 384],
      ["Pellet 30 [hp_C]/1 x353", 353],
    ] as const) {
      const reasons: string[] = [];
      expect(keepNumber(line, quantity, reasons), line).toBe(quantity);
      expect(reasons, line).toEqual([]);
    }
    for (const [line, quantity, shown] of [
      ["Salicylic acid .36 g/20mL LOTION x20", 20, "20mL"],
      ["Pellet 30 [hp_C]/1 x30", 30, "30 [hp_C]"],
      ["Drops 5 mcg/mL x5", 5, "5 mcg"],
      ["Tabs 10 % x10", 10, "10 %"],
    ] as const) {
      const reasons: string[] = [];
      keepNumber(line, quantity, reasons);
      expect(reasons, line).toEqual([
        `quantity "${String(quantity)}" is also written as a strength ("${shown}"): check`,
      ]);
    }
    // A quantity that is not written at all is still left empty.
    const missing: string[] = [];
    expect(keepNumber(LINE, 77, missing)).toBeNull();
    expect(missing).toEqual([
      'quantity "77" is not written in the line: left empty',
    ]);
  });

  it("[SYS-119] Given a copy of a line that joins two words the line keeps apart, then it does not match the line and is set aside", () => {
    const result = matchLines(
      [LINE],
      [
        {
          line: 1,
          source_line: LINE.replace("Amoxicillin 500", "Amoxicillin500"),
        },
      ],
    );
    expect(result.problems).toEqual([
      "the AI's copy of line 1 does not match the line: set aside",
    ]);
  });

  it("[SYS-119, SYS-313] Given a part or lot number, then it must match a whole code: a copy that stops at a dash, slash or dot inside the code is refused", () => {
    const line =
      "We have 2 x SWP-1155-6 (Synthetic part) at B03; lot L-12-B, ref A1.5, see SWP-9506-7.";
    for (const short of ["SWP-1155", "L-12", "1155-6", "A1", "SWP-9506"]) {
      expect(findCode(line, short), short).toBeNull();
    }
    for (const whole of [
      "SWP-1155-6",
      "L-12-B",
      "A1.5",
      "SWP-9506-7",
      "swp-1155-6",
    ]) {
      expect(findCode(line, whole), whole).toBe(
        whole.toUpperCase() === whole ? whole : "SWP-1155-6",
      );
    }
    expect(findCode("P/N:SWP-1-1,qty 2", "SWP-1-1")).toBe("SWP-1-1");
    expect(findCode("(lot#Q7)", "Q7")).toBe("Q7");
    expect(findCode("lot Q7", "  ")).toBeNull();
    // A blank copy finds nothing, even in a line that contains the word "null".
    expect(findCode("lot null exp", "  ")).toBeNull();
    expect(findIn("value null here", " ")).toBeNull();
    // A code printed with a space is matched with any spacing, and spaces around a copy are dropped.
    expect(findCode("lot A 12 exp 2028", "a  12")).toBe("A 12");
    expect(findCode("lot A12 exp 2028", " A12 ")).toBe("A12");
    const reasons: string[] = [];
    expect(keepCode(line, "part number", "SWP-1155", reasons)).toBeNull();
    expect(keepCode(line, "part number", "swp-1155-6", reasons)).toBe(
      "SWP-1155-6",
    );
    expect(keepCode(line, "lot number", null, reasons)).toBeNull();
    expect(reasons).toEqual([
      'part number "SWP-1155" is not written in the line as a whole code: left empty',
    ]);
  });
});
