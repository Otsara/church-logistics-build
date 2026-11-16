// The donor-list and parts-email readers (AIC-101, AIC-301): the AI copies text, the code
// interprets it, and a person confirms every line (owner, 2026-11-16; ADR-035). The AI answers
// below are hand-written test fixtures, not recordings.
import { describe, expect, it } from "vitest";
import {
  checkDonorList,
  donorListStep,
  type DonorListOutput,
} from "../src/steps/donor-list.ts";
import {
  checkPartsEmail,
  partsEmailStep,
  type PartsEmailOutput,
} from "../src/steps/parts-email.ts";

const LINES = [
  "Donation list, synthetic clinic donor D001",
  "Amoxicillin 500 mg CAPSULE x120 lot A123 exp 06/2028 Maker: Synthetic Labs",
  "Ibuprofen 200 mg TABLET x50 exp see box",
  "Paracetamol 500 mg TABLET x30 lot P9",
];

const lot = (over: Partial<DonorListOutput["lots"][number]> = {}) => ({
  line: 2,
  source_line: LINES[1] as string,
  generic_name: "Amoxicillin",
  strength: "500 mg",
  dosage_form: "CAPSULE",
  quantity: 120,
  lot_number: "A123",
  expiry_text: "06/2028",
  manufacturer: "Synthetic Labs",
  confidence: 0.9,
  ...over,
});

describe("Donor-list reader (AIC-101)", () => {
  it("[SYS-119] Given a line read correctly, then each value is kept as copied, the expiry is read by the label reader, and the line still waits for a person to confirm it", () => {
    const result = checkDonorList({ lines: LINES }, { lots: [lot()] });
    expect(result.lines).toEqual([
      {
        line: 2,
        sourceLine: LINES[1],
        genericName: "Amoxicillin",
        strength: "500 mg",
        dosageForm: "CAPSULE",
        quantity: 120,
        lotNumber: "A123",
        expiryText: "06/2028",
        expiry: "2028-06-30",
        expiryMonthOnly: true,
        manufacturer: "Synthetic Labs",
        confidence: 0.9,
        needsReview: false,
        reasons: [],
        status: "to confirm",
      },
    ]);
    expect(result.unread).toEqual([
      { line: 1, sourceLine: LINES[0] },
      { line: 3, sourceLine: LINES[2] },
      { line: 4, sourceLine: LINES[3] },
    ]);
    expect(result.problems).toEqual([]);
  });

  it("[TC-006] Given a line whose expiry cannot be read, then the expiry is null, never a guessed date, and the line needs review", () => {
    const result = checkDonorList(
      { lines: LINES },
      {
        lots: [
          lot({
            line: 3,
            source_line: LINES[2] as string,
            generic_name: "Ibuprofen",
            strength: "200 mg",
            dosage_form: "TABLET",
            quantity: 50,
            lot_number: null,
            expiry_text: "see box",
            manufacturer: null,
          }),
        ],
      },
    );
    expect(result.lines[0]).toMatchObject({
      expiry: null,
      expiryMonthOnly: false,
      needsReview: true,
      reasons: [
        "no lot number read",
        'expiry date not readable: "see box": check the lot',
      ],
    });
    // No expiry at all is the same.
    const none = checkDonorList(
      { lines: LINES },
      {
        lots: [
          lot({
            line: 4,
            source_line: LINES[3] as string,
            generic_name: "Paracetamol",
            dosage_form: "TABLET",
            quantity: 30,
            lot_number: "P9",
            expiry_text: null,
            manufacturer: null,
          }),
        ],
      },
    );
    expect(none.lines[0]).toMatchObject({
      expiry: null,
      needsReview: true,
      reasons: ["no expiry date recorded: check the lot"],
    });
  });

  it("[SYS-119] Given a value the AI gives that is not written in the line (ignoring only letter case and extra spaces), then it is left empty and the line needs review: the AI never supplies a lot number, date, maker or amount", () => {
    const result = checkDonorList(
      { lines: LINES },
      {
        lots: [
          lot({
            lot_number: "A124",
            expiry_text: "2028-06-30",
            manufacturer: "Real Pharma",
            quantity: 12,
            generic_name: "Amoxycillin",
            strength: "500mg ",
            dosage_form: "capsule",
          }),
        ],
      },
    );
    expect(result.lines[0]).toMatchObject({
      genericName: null,
      strength: null,
      // Kept as printed in the line, not as the AI spelled it (ADR-036).
      dosageForm: "CAPSULE",
      quantity: null,
      lotNumber: null,
      expiryText: null,
      expiry: null,
      manufacturer: null,
      needsReview: true,
    });
    expect(result.lines[0]?.reasons).toEqual([
      'medicine name "Amoxycillin" is not written in the line: left empty',
      'strength "500mg " is not written in the line: left empty',
      'quantity "12" is not written in the line: left empty',
      'lot number "A124" is not written in the line: left empty',
      'expiry "2028-06-30" is not written in the line: left empty',
      'maker "Real Pharma" is not written in the line: left empty',
      "no medicine name read",
      "no quantity read",
      "no lot number read",
      "no expiry date recorded: check the lot",
    ]);
  });

  it("[SYS-119] Given an answer for a line that does not exist or does not match its text, then it is set aside; given a line answered more than once, then every answer for it is set aside and the line is entered by hand", () => {
    const result = checkDonorList(
      { lines: LINES },
      {
        lots: [
          lot({ line: 9 }),
          lot({ line: 3 }),
          lot(),
          lot({ generic_name: "Amoxicillin" }),
        ],
      },
    );
    expect(result.problems).toEqual([
      "the AI answered for line 9, which is not in the list: set aside",
      "the AI's copy of line 3 does not match the line: set aside",
      "line 2 has more than one item: all answers for it set aside, enter it by hand",
    ]);
    expect(result.lines).toEqual([]);
    expect(result.unread.map((u) => u.line)).toEqual([1, 2, 3, 4]);
  });

  it("[TC-017] Given the lines, then the prompt carries only the numbered lines and the instructions, and asks for copies, never conversions", () => {
    const prompt = donorListStep.buildPrompt({ lines: ["Aspirin 81 mg x10"] });
    expect(prompt).toContain("1: Aspirin 81 mg x10");
    expect(prompt).toMatch(/exactly as it is written/);
    expect(prompt).toMatch(/null/);
    expect(donorListStep).toMatchObject({ id: "AIC-101", tier: "cheap" });
    // The schema refuses a guessed field or an out-of-range confidence.
    expect(
      donorListStep.outputSchema.safeParse({ lots: [{ ...lot(), extra: 1 }] })
        .success,
    ).toBe(false);
    expect(
      donorListStep.outputSchema.safeParse({ lots: [lot({ confidence: 1.5 })] })
        .success,
    ).toBe(false);
    expect(
      donorListStep.outputSchema.safeParse({ lots: [lot()] }).success,
    ).toBe(true);
  });
});

const EMAIL = [
  "Subject: parts available at base 2",
  "We have 2 x SWP-1155-6 (Synthetic part Sanurul) on the shelf.",
  "Also P/N SWP-9506-7, qty 1",
];

const part = (over: Partial<PartsEmailOutput["parts"][number]> = {}) => ({
  line: 2,
  source_line: EMAIL[1] as string,
  part_number: "SWP-1155-6",
  quantity: 2,
  description: "Synthetic part Sanurul",
  confidence: 0.8,
  ...over,
});

describe("Reader edge cases (SYS-119, SYS-313)", () => {
  it("[SYS-119] Given lines numbered in the prompt, then each line carries its own number on its own line", () => {
    for (const step of [donorListStep, partsEmailStep]) {
      expect(step.buildPrompt({ lines: ["first", "second"] })).toMatch(
        /\n1: first\n2: second$/,
      );
    }
  });

  it("[SYS-119] Given a copy that differs only in letter case or extra spaces, then it is accepted and kept as printed in the line; an empty copy or a different dosage form is left empty with the reason", () => {
    const spaced = "Amoxicillin  500 mg   CAPSULE x120 lot A123 exp 06/2028";
    const result = checkDonorList(
      { lines: [spaced] },
      {
        lots: [
          lot({
            line: 1,
            source_line: ` amoxicillin 500 mg capsule x120 lot a123 exp 06/2028 `,
            strength: "500  mg",
            dosage_form: "TABLET",
            lot_number: "  ",
            manufacturer: null,
          }),
        ],
      },
    );
    expect(result.problems).toEqual([]);
    expect(result.lines[0]).toMatchObject({
      strength: "500 mg",
      dosageForm: null,
      lotNumber: null,
    });
    expect(result.lines[0]?.reasons).toEqual([
      'dosage form "TABLET" is not written in the line: left empty',
      'lot number "  " is not written in the line: left empty',
      "no dosage form read",
      "no lot number read",
    ]);
  });

  it("[SYS-313] Given a parts answer, then a confidence outside 0 to 1 or an extra field is refused, and one inside is accepted", () => {
    const answer = (confidence: number) => ({ parts: [part({ confidence })] });
    expect(partsEmailStep.outputSchema.safeParse(answer(0.8)).success).toBe(
      true,
    );
    expect(partsEmailStep.outputSchema.safeParse(answer(0)).success).toBe(true);
    expect(partsEmailStep.outputSchema.safeParse(answer(1)).success).toBe(true);
    expect(partsEmailStep.outputSchema.safeParse(answer(1.5)).success).toBe(
      false,
    );
    expect(partsEmailStep.outputSchema.safeParse(answer(-0.1)).success).toBe(
      false,
    );
  });
});

describe("Donor-list review decisions (REV-010 part 2)", () => {
  it("[SYS-119] Given a line read with no dosage form, then it needs review, because the form is needed to match the catalogue; a missing strength alone does not", () => {
    const noForm = checkDonorList(
      { lines: ["Amoxicillin 500 mg x120 lot A1 exp 06/2028"] },
      {
        lots: [
          lot({
            line: 1,
            source_line: "Amoxicillin 500 mg x120 lot A1 exp 06/2028",
            dosage_form: null,
            lot_number: "A1",
            manufacturer: null,
          }),
        ],
      },
    );
    expect(noForm.lines[0]).toMatchObject({
      needsReview: true,
      reasons: ["no dosage form read"],
    });
    const noStrength = checkDonorList(
      { lines: ["Oral rehydration salts POWDER x40 lot R1 exp 06/2028"] },
      {
        lots: [
          lot({
            line: 1,
            source_line: "Oral rehydration salts POWDER x40 lot R1 exp 06/2028",
            generic_name: "Oral rehydration salts",
            strength: null,
            dosage_form: "POWDER",
            quantity: 40,
            lot_number: "R1",
            manufacturer: null,
          }),
        ],
      },
    );
    expect(noStrength.lines[0]).toMatchObject({
      needsReview: false,
      reasons: [],
    });
  });
});

describe("Parts-email reader (AIC-301)", () => {
  it("[SYS-313] Given a part read correctly, then the part number, quantity and description are kept as copied; the base and serviceability are left for a person to enter, and the line waits for confirmation", () => {
    const result = checkPartsEmail({ lines: EMAIL }, { parts: [part()] });
    expect(result.lines).toEqual([
      {
        line: 2,
        sourceLine: EMAIL[1],
        partNumber: "SWP-1155-6",
        quantity: 2,
        description: "Synthetic part Sanurul",
        confidence: 0.8,
        baseId: null,
        serviceable: null,
        needsReview: false,
        reasons: [],
        status:
          "to confirm: a person enters the base and whether it is serviceable",
      },
    ]);
    expect(result.unread.map((u) => u.line)).toEqual([1, 3]);
  });

  it("[SYS-313] Given a part number or quantity the AI gives that is not written in the line, or none at all, then it is left empty and the line needs review", () => {
    const result = checkPartsEmail(
      { lines: EMAIL },
      {
        parts: [
          part({
            part_number: "SWP-1155-5",
            quantity: 3,
            description: "a pump",
          }),
          part({
            line: 3,
            source_line: EMAIL[2] as string,
            part_number: null,
            quantity: null,
            description: null,
          }),
        ],
      },
    );
    expect(
      result.lines.map((l) => [
        l.partNumber,
        l.quantity,
        l.description,
        l.needsReview,
        l.reasons,
      ]),
    ).toEqual([
      [
        null,
        null,
        null,
        true,
        [
          'part number "SWP-1155-5" is not written in the line: left empty',
          'quantity "3" is not written in the line: left empty',
          'description "a pump" is not written in the line: left empty',
          "no part number read",
          "no quantity read",
        ],
      ],
      [null, null, null, true, ["no part number read", "no quantity read"]],
    ]);
  });

  it("[SYS-313] Given an answer for a missing or mismatched line, then it is set aside; given a line with more than one part, then every answer for it is set aside and the line is entered by hand", () => {
    const result = checkPartsEmail(
      { lines: EMAIL },
      {
        parts: [
          part({ line: 0 }),
          part({ source_line: "other" }),
          part(),
          part(),
        ],
      },
    );
    expect(result.problems).toEqual([
      "the AI answered for line 0, which is not in the list: set aside",
      "the AI's copy of line 2 does not match the line: set aside",
      "line 2 has more than one item: all answers for it set aside, enter it by hand",
    ]);
    expect(result.lines).toEqual([]);
  });

  it("[TC-017] Given the email lines, then the prompt carries only the numbered lines and the instructions, and the schema has no base or serviceability field", () => {
    const prompt = partsEmailStep.buildPrompt({
      lines: ["P/N SWP-0001-1 qty 4"],
    });
    expect(prompt).toContain("1: P/N SWP-0001-1 qty 4");
    expect(prompt).toMatch(/exactly as it is written/);
    expect(prompt).not.toMatch(/serviceable/i);
    expect(partsEmailStep).toMatchObject({ id: "AIC-301", tier: "cheap" });
    expect(
      partsEmailStep.outputSchema.safeParse({
        parts: [{ ...part(), serviceable: true }],
      }).success,
    ).toBe(false);
  });
});
