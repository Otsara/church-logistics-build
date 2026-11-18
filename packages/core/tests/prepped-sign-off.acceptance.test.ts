// Signing off the packing list (SYS-010, IU-102; TC-009): the packing list stays a suggestion
// until the lead clinician, a pharmacist or clinician, signs it off; a change after sign-off
// clears it; and nothing is called "approved" (owner, 2026-11-12 and 2026-11-18; DOC-045 P10).
import { describe, expect, it } from "vitest";
import {
  SIGNING_ROLE,
  packingListStatus,
  signOffPackingList,
  type PackingLine,
} from "../src/prepped/sign-off.ts";

const LINES: readonly PackingLine[] = [
  { lotId: "LOT-2", quantity: 120 },
  { lotId: "LOT-1", quantity: 30 },
];

const sign = (
  overrides: Partial<Parameters<typeof signOffPackingList>[0]> = {},
) =>
  signOffPackingList({
    lines: LINES,
    role: SIGNING_ROLE,
    personId: "PER-1",
    time: "2026-11-18T15:00:00Z",
    ...overrides,
  });

describe("Packing list sign-off (SYS-010)", () => {
  it("[TC-009] Given a packing list not yet signed off, then it is a suggestion; once the lead clinician signs it off, it is signed off, with who and when in the audit log", () => {
    expect(SIGNING_ROLE).toBe("lead clinician");
    expect(packingListStatus(LINES, null)).toEqual({
      status: "not signed off",
      message:
        "Suggestion: the lead clinician has not signed off this packing list",
    });
    const result = sign();
    expect(result).toMatchObject({
      ok: true,
      signOff: { personId: "PER-1", time: "2026-11-18T15:00:00Z" },
      entry: {
        time: "2026-11-18T15:00:00Z",
        actor: { kind: "person", personId: "PER-1" },
        action: "packing list signed off",
        before: { signedOff: false },
        after: { signedOff: true, lines: 2 },
      },
    });
    if (!result.ok) return;
    expect(packingListStatus(LINES, result.signOff)).toEqual({
      status: "signed off",
      message: "Signed off by PER-1 at 2026-11-18T15:00:00Z",
    });
    // A lot listed twice after sign-off is a change.
    expect(
      packingListStatus(
        [
          { lotId: "LOT-1", quantity: 30 },
          { lotId: "LOT-1", quantity: 30 },
        ],
        result.signOff,
      ).status,
    ).toBe("changed since sign-off");
    // The list is recorded in lot order, whatever order it was given in.
    expect(result.signOff.signedList).toBe('[["LOT-1",30],["LOT-2",120]]');
    const four: PackingLine[] = [
      { lotId: "B", quantity: 2 },
      { lotId: "D", quantity: 4 },
      { lotId: "A", quantity: 1 },
      { lotId: "C", quantity: 3 },
    ];
    const signedFour = sign({ lines: four });
    if (!signedFour.ok) throw new Error(signedFour.reason);
    expect(signedFour.signOff.signedList).toBe(
      '[["A",1],["B",2],["C",3],["D",4]]',
    );
    for (const order of [
      [0, 1, 2, 3],
      [3, 2, 1, 0],
      [2, 0, 3, 1],
      [1, 3, 0, 2],
    ]) {
      const reordered = order.map((i) => four[i] as PackingLine);
      expect(packingListStatus(reordered, signedFour.signOff).status).toBe(
        "signed off",
      );
    }
    // The order of the lines does not matter.
    expect(packingListStatus([...LINES].reverse(), result.signOff).status).toBe(
      "signed off",
    );
  });

  it("[TC-009] Given any change to the packing list after sign-off, then it is no longer signed off and must be signed off again", () => {
    const result = sign();
    if (!result.ok) throw new Error(result.reason);
    for (const changed of [
      [
        { lotId: "LOT-2", quantity: 121 },
        { lotId: "LOT-1", quantity: 30 },
      ],
      [{ lotId: "LOT-2", quantity: 120 }],
      [...LINES, { lotId: "LOT-3", quantity: 1 }],
      [
        { lotId: "LOT-9", quantity: 120 },
        { lotId: "LOT-1", quantity: 30 },
      ],
    ]) {
      expect(
        packingListStatus(changed, result.signOff),
        JSON.stringify(changed),
      ).toEqual({
        status: "changed since sign-off",
        message:
          "Changed since PER-1 signed it off at 2026-11-18T15:00:00Z: the lead clinician signs it off again",
      });
    }
  });

  it("[TC-009] Given anyone but the lead clinician, no person, a time that is not a valid UTC date and time, or an empty packing list, then sign-off is refused", () => {
    for (const role of [
      "trip coordinator",
      "team leader",
      "Lead clinician",
      "",
    ]) {
      expect(sign({ role }), role).toEqual({
        ok: false,
        reason:
          "only the lead clinician (a pharmacist or clinician) signs off the packing list",
      });
    }
    expect(sign({ personId: "  " })).toEqual({
      ok: false,
      reason: "the person signing off is not identified",
    });
    expect(sign({ time: "2026-11-18" })).toEqual({
      ok: false,
      reason:
        "the time is not a valid UTC date and time (YYYY-MM-DDTHH:MM:SSZ)",
    });
    expect(
      sign({ lines: [...LINES, { lotId: "LOT-1", quantity: 5 }] }),
    ).toEqual({
      ok: false,
      reason:
        "lot LOT-1 is on the packing list more than once: correct it before signing off",
    });
    expect(
      sign({
        lines: [
          ...LINES,
          { lotId: "LOT-2", quantity: 1 },
          { lotId: "LOT-1", quantity: 1 },
        ],
      }),
    ).toEqual({
      ok: false,
      reason:
        "lot LOT-2, LOT-1 is on the packing list more than once: correct it before signing off",
    });
    for (const quantity of [0, -5, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        sign({ lines: [{ lotId: "LOT-1", quantity }] }),
        String(quantity),
      ).toEqual({
        ok: false,
        reason: `lot LOT-1 has quantity ${String(quantity)}: every quantity is a whole number of 1 or more`,
      });
    }
    expect(sign({ lines: [{ lotId: "  ", quantity: 3 }] })).toEqual({
      ok: false,
      reason: "line 1 has no lot id: every line names its lot",
    });
    expect(sign({ lines: [] })).toEqual({
      ok: false,
      reason: "the packing list is empty: there is nothing to sign off",
    });
  });

  it("[TC-009, SYS-010] Given every message sign-off gives, then none says approved", () => {
    const result = sign();
    if (!result.ok) throw new Error(result.reason);
    const texts = [
      packingListStatus(LINES, null).message,
      packingListStatus(LINES, result.signOff).message,
      packingListStatus([], result.signOff).message,
      JSON.stringify(result.entry),
      ...["", "x"].map((role) => JSON.stringify(sign({ role }))),
    ];
    for (const text of texts) expect(text).not.toMatch(/approv/i);
  });
});
