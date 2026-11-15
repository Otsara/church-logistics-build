// SpareWing candidate rules: acceptance tests from DOC-070 (SYS-301 to SYS-309). Every base,
// aircraft, part, pilot and community is synthetic, in the made-up formats of DAT-301.
import { describe, expect, it } from "vitest";
import { parseIsoDate } from "../src/dates.ts";
import { DECIDING_ROLES, recordDecision } from "../src/sparewing/decision.ts";
import { missedFlights } from "../src/sparewing/missed.ts";
import {
  findPartCandidates,
  SIGN_OFF_FLAG,
  type PartNeed,
  type StockPart,
  type TransferMode,
} from "../src/sparewing/parts.ts";
import {
  checkPilot,
  type Pilot,
  type PilotNeed,
} from "../src/sparewing/pilots.ts";
import { rankOptions, type PlanOption } from "../src/sparewing/rank.ts";

const d = parseIsoDate;

const NEED: PartNeed = {
  partNumber: "SWP-1000-1",
  alternates: ["SWP-2000-2"],
  aircraftBaseId: "B01",
  asOf: d("2026-11-16"),
  orderLeadTimeDays: 14,
  quantityNeeded: 1,
};

const part = (overrides: Partial<StockPart> = {}): StockPart => ({
  id: "P1",
  partNumber: "SWP-2000-2",
  baseId: "B02",
  quantity: 1,
  serviceable: true,
  ...overrides,
});

const AIR: TransferMode = {
  fromBaseId: "B02",
  toBaseId: "B01",
  mode: "air",
  leadTimeDays: 3,
};

describe("SpareWing part candidates", () => {
  it("[TC-301] Given a grounded aircraft needing part A, a listed alternate B, and one B at base 2, then B appears as a candidate with source base, transfer mode, ETA and the sign-off flag", () => {
    const result = findPartCandidates(NEED, [part()], [AIR]);
    expect(result.noCandidates).toBeNull();
    expect(result.candidates).toEqual([
      {
        partId: "P1",
        partNumber: "SWP-2000-2",
        match: "listed alternate",
        sourceBaseId: "B02",
        quantity: 1,
        transferMode: "air",
        leadTimeDays: 3,
        eta: "2026-11-19",
        reasons: [
          "listed by the program as an alternate for SWP-1000-1",
          "air from B02 to B01: 3 days",
        ],
        flag: SIGN_OFF_FLAG,
        holdsEnough: true,
        interchange:
          "interchange with SWP-1000-1 to be confirmed by the pilot, mechanic or flight base director before use",
      },
    ]);
    expect(SIGN_OFF_FLAG).toBe(
      "requires sign-off by a licensed mechanic or the operator",
    );
  });

  it("[SYS-301] Given parts with the needed number, on site or elsewhere, by several transfer modes, then each appears; a part with any other number does not", () => {
    const result = findPartCandidates(
      NEED,
      [
        part({
          id: "P-SITE",
          partNumber: "SWP-1000-1",
          baseId: "B01",
          quantity: 2,
        }),
        part({ id: "P-OTHER", partNumber: "SWP-9000-9", baseId: "B01" }),
        part({ id: "P-B02", partNumber: "SWP-1000-1" }),
      ],
      [
        AIR,
        { ...AIR, mode: "mail", leadTimeDays: 6 },
        { ...AIR, fromBaseId: "B03" },
      ],
    );
    expect(
      result.candidates.map((c) => [c.partId, c.match, c.transferMode, c.eta]),
    ).toEqual([
      ["P-SITE", "same part number", "on site", "2026-11-16"],
      ["P-B02", "same part number", "air", "2026-11-19"],
      ["P-B02", "same part number", "mail", "2026-11-22"],
    ]);
    expect(result.candidates[0]?.reasons).toEqual([
      "same part number",
      "at the aircraft's base",
    ]);
    // A part with the needed number needs no interchange (owner, 2026-11-15; S1).
    expect(result.candidates.map((c) => c.interchange)).toEqual([
      null,
      null,
      null,
    ]);
  });

  it("[TC-302] Given no stock and no alternate, then the result says no candidates were found, to ask a human, and shows any entered order lead time", () => {
    const none = findPartCandidates({ ...NEED, alternates: [] }, [], []);
    expect(none).toEqual({
      candidates: [],
      noCandidates: {
        message:
          "No candidates found: ask a person (the mechanic or another base) before deciding",
        orderLeadTime: "order lead time entered: 14 days",
      },
    });
    const noLeadTime = findPartCandidates(
      { ...NEED, alternates: [], orderLeadTimeDays: null },
      [],
      [],
    );
    expect(noLeadTime.noCandidates?.orderLeadTime).toBe(
      "no order lead time entered",
    );
  });

  it('[TC-306] Given a transfer mode with no entered lead time, then the ETA shows "unverified"', () => {
    const result = findPartCandidates(
      NEED,
      [part()],
      [{ ...AIR, leadTimeDays: null }],
    );
    expect(result.candidates[0]).toMatchObject({
      transferMode: "air",
      leadTimeDays: null,
      eta: "unverified",
      reasons: [
        "listed by the program as an alternate for SWP-1000-1",
        "air from B02 to B01: no lead time entered, ETA unverified",
      ],
    });
    // With no transfer mode entered between the bases, the part still shows, its ETA unverified.
    const noRoute = findPartCandidates(NEED, [part()], []);
    expect(noRoute.candidates[0]).toMatchObject({
      transferMode: null,
      leadTimeDays: null,
      eta: "unverified",
      reasons: [
        "listed by the program as an alternate for SWP-1000-1",
        "no transfer mode entered from B02 to B01: ETA unverified",
      ],
    });
  });

  it("[SYS-304] Given a transfer mode to another base, a lead time of 0 or a negative lead time, then only modes to the aircraft's base count, 0 days means the same day, and a negative lead time is unverified", () => {
    const result = findPartCandidates(
      NEED,
      [part()],
      [
        { ...AIR, toBaseId: "B09" },
        { ...AIR, mode: "road", leadTimeDays: 0 },
        { ...AIR, mode: "mail", leadTimeDays: -1 },
      ],
    );
    expect(
      result.candidates.map((c) => [c.transferMode, c.leadTimeDays, c.eta]),
    ).toEqual([
      ["road", 0, "2026-11-16"],
      ["mail", null, "unverified"],
    ]);
  });

  it("[TC-317] Given part numbers entered with stray spaces or in another letter case, then they still match; a different dash or character does not", () => {
    const result = findPartCandidates(
      { ...NEED, partNumber: " swp-1000-1", alternates: ["swp-2000-2 "] },
      [
        part({ id: "P-SAME", partNumber: "SWP-1000-1 ", baseId: "B01" }),
        part({ id: "P-ALT", partNumber: "  Swp-2000-2", baseId: "B01" }),
        part({ id: "P-DASH", partNumber: "SWP-10001", baseId: "B01" }),
        part({ id: "P-OTHER", partNumber: "SWP-1000-2", baseId: "B01" }),
      ],
      [],
    );
    expect(result.candidates.map((c) => [c.partId, c.match])).toEqual([
      ["P-SAME", "same part number"],
      ["P-ALT", "listed alternate"],
    ]);
    // The stock part number is shown as entered; the needed number without its stray spaces.
    expect(result.candidates[1]).toMatchObject({
      partNumber: "  Swp-2000-2",
      interchange:
        "interchange with swp-1000-1 to be confirmed by the pilot, mechanic or flight base director before use",
    });
  });

  it("[TC-318] Given two parts needed, then a base holding one is still listed, marked as holding 1 of 2 needed; a base holding enough is not marked; with no valid quantity needed, every candidate says so", () => {
    const result = findPartCandidates(
      { ...NEED, quantityNeeded: 2 },
      [
        part({ id: "P-ONE", baseId: "B01" }),
        part({ id: "P-TWO", baseId: "B01", quantity: 2 }),
      ],
      [],
    );
    expect(
      result.candidates.map((c) => [c.partId, c.holdsEnough, c.reasons]),
    ).toEqual([
      [
        "P-ONE",
        false,
        [
          "listed by the program as an alternate for SWP-1000-1",
          "at the aircraft's base",
          "holds 1 of 2 needed",
        ],
      ],
      [
        "P-TWO",
        true,
        [
          "listed by the program as an alternate for SWP-1000-1",
          "at the aircraft's base",
        ],
      ],
    ]);
    for (const quantityNeeded of [null, 0, -1, 1.5, Number.NaN]) {
      const unknown = findPartCandidates(
        { ...NEED, quantityNeeded },
        [part({ baseId: "B01" })],
        [],
      );
      expect(unknown.candidates[0], String(quantityNeeded)).toMatchObject({
        holdsEnough: null,
        reasons: [
          "listed by the program as an alternate for SWP-1000-1",
          "at the aircraft's base",
          "quantity needed not entered: check the base holds enough",
        ],
      });
    }
    // The note follows each transfer mode's candidate too.
    const away = findPartCandidates(
      { ...NEED, quantityNeeded: 3 },
      [part({ quantity: 2 })],
      [AIR],
    );
    expect(away.candidates[0]?.reasons).toEqual([
      "listed by the program as an alternate for SWP-1000-1",
      "air from B02 to B01: 3 days",
      "holds 2 of 3 needed",
    ]);
    const unrouted = findPartCandidates(
      { ...NEED, quantityNeeded: 3 },
      [part({ quantity: 2 })],
      [],
    );
    expect(unrouted.candidates[0]?.reasons).toEqual([
      "listed by the program as an alternate for SWP-1000-1",
      "no transfer mode entered from B02 to B01: ETA unverified",
      "holds 2 of 3 needed",
    ]);
  });

  it("[TC-302] Given no candidates and an order lead time that is negative, fractional or not a number, then it reads as not entered; 0 days is shown", () => {
    for (const orderLeadTimeDays of [-3, 2.5, Number.NaN]) {
      expect(
        findPartCandidates({ ...NEED, orderLeadTimeDays }, [], []).noCandidates
          ?.orderLeadTime,
        String(orderLeadTimeDays),
      ).toBe("no order lead time entered");
    }
    expect(
      findPartCandidates({ ...NEED, orderLeadTimeDays: 0 }, [], []).noCandidates
        ?.orderLeadTime,
    ).toBe("order lead time entered: 0 days");
  });

  it("[TC-307] Given a part marked not serviceable, then it never appears", () => {
    const result = findPartCandidates(
      NEED,
      [part({ serviceable: false }), part({ id: "P0", quantity: 0 })],
      [AIR],
    );
    expect(result.candidates).toEqual([]);
    expect(result.noCandidates).not.toBeNull();
  });
});

const PILOT_NEED: PilotNeed = {
  typeRatings: ["R1"],
  aircraftRatings: ["R2"],
  neededFrom: d("2026-11-16"),
  expectedEnd: d("2026-11-20"),
};

const pilot = (overrides: Partial<Pilot> = {}): Pilot => ({
  id: "PIL01",
  baseId: "B01",
  ratings: ["R1", "R2"],
  currencyUntil: d("2027-06-30"),
  availability: [{ from: d("2026-11-01"), to: d("2026-11-30") }],
  ...overrides,
});

describe("SpareWing pilot candidates", () => {
  it("[SYS-303] Given a pilot meeting every requirement, then the pilot is a candidate with the sign-off flag", () => {
    expect(checkPilot(pilot(), PILOT_NEED)).toEqual({
      pilotId: "PIL01",
      baseId: "B01",
      status: "candidate",
      missingData: [],
      reasons: [
        "holds R1, R2",
        "current until 2027-06-30",
        "available 2026-11-16 to 2026-11-20",
      ],
      flag: SIGN_OFF_FLAG,
    });
  });

  it("[TC-303] Given a pilot whose entered currency lapsed, then the pilot is excluded with the reason shown", () => {
    const result = checkPilot(
      pilot({ currencyUntil: d("2026-11-15") }),
      PILOT_NEED,
    );
    expect(result.status).toBe("excluded");
    expect(result.reasons).toEqual([
      "holds R1, R2",
      "currency lapsed on 2026-11-15",
      "available 2026-11-16 to 2026-11-20",
    ]);
  });

  it('[TC-304] Given a pilot with no availability data, then the pilot shows as "data missing: availability not entered", not excluded', () => {
    const result = checkPilot(pilot({ availability: null }), PILOT_NEED);
    expect(result.status).toBe("data_missing");
    expect(result.reasons).toContain("availability not entered");
    expect(result.missingData).toEqual(["availability not entered"]);
    // Ratings and currency not entered are data missing too, never a silent pass or exclusion.
    expect(checkPilot(pilot({ ratings: null }), PILOT_NEED)).toMatchObject({
      status: "data_missing",
      missingData: ["ratings not entered"],
      reasons: [
        "ratings not entered",
        "current until 2027-06-30",
        "available 2026-11-16 to 2026-11-20",
      ],
    });
    expect(
      checkPilot(pilot({ currencyUntil: null }), PILOT_NEED).reasons,
    ).toContain("currency not entered");
    // Something known that rules the pilot out outweighs data missing.
    expect(
      checkPilot(pilot({ availability: null, ratings: ["R1"] }), PILOT_NEED)
        .status,
    ).toBe("excluded");
  });

  it("[TC-313] Given a pilot current on the date needed whose currency lapses before the expected end of the disruption, then the pilot is not a candidate, with the lapse date in the reason", () => {
    const result = checkPilot(
      pilot({ currencyUntil: d("2026-11-19") }),
      PILOT_NEED,
    );
    expect(result.status).toBe("excluded");
    expect(result.reasons).toContain(
      "currency lapses on 2026-11-19, before the expected end 2026-11-20",
    );
    // Current through the last day is enough.
    expect(
      checkPilot(pilot({ currencyUntil: d("2026-11-20") }), PILOT_NEED).status,
    ).toBe("candidate");
  });

  it("[SYS-303] Given currency ending on the date needed itself, then it is current that day but lapses before the expected end", () => {
    expect(
      checkPilot(pilot({ currencyUntil: d("2026-11-16") }), PILOT_NEED).reasons,
    ).toContain(
      "currency lapses on 2026-11-16, before the expected end 2026-11-20",
    );
  });

  it('[TC-314] Given an aircraft type requiring rating R1 and an aircraft adding R2, then a pilot holding only R1 is not a candidate, with the reason "missing R2"', () => {
    const result = checkPilot(pilot({ ratings: ["R1"] }), PILOT_NEED);
    expect(result.status).toBe("excluded");
    expect(result.reasons[0]).toBe("missing R2");
    expect(checkPilot(pilot({ ratings: [] }), PILOT_NEED).reasons[0]).toBe(
      "missing R1, R2",
    );
  });

  it("[SYS-303] Given availability that misses any day from the date needed to the expected end, then the pilot is excluded, naming the first day", () => {
    const gap = checkPilot(
      pilot({
        availability: [
          { from: d("2026-11-10"), to: d("2026-11-17") },
          { from: d("2026-11-19"), to: d("2026-11-25") },
        ],
      }),
      PILOT_NEED,
    );
    expect(gap.status).toBe("excluded");
    expect(gap.reasons).toContain("not available on 2026-11-18");
    // Windows that together cover every day are enough, in any order.
    const joined = checkPilot(
      pilot({
        availability: [
          { from: d("2026-11-18"), to: d("2026-11-20") },
          { from: d("2026-11-16"), to: d("2026-11-17") },
        ],
      }),
      PILOT_NEED,
    );
    expect(joined.status).toBe("candidate");
    expect(
      checkPilot(pilot({ availability: [] }), PILOT_NEED).reasons,
    ).toContain("not available on 2026-11-16");
    // The last day counts too.
    expect(
      checkPilot(
        pilot({
          availability: [{ from: d("2026-11-16"), to: d("2026-11-19") }],
        }),
        PILOT_NEED,
      ).reasons,
    ).toContain("not available on 2026-11-20");
  });
});

describe("SpareWing missed community flights", () => {
  // 2026-11-16 is a Monday; Monday to Friday is five days inclusive.
  const window = {
    flightDays: ["Tue", "Fri"] as const,
    start: d("2026-11-16"),
    expectedEnd: d("2026-11-20"),
    coverBaseIds: ["B01"],
  };

  it("[TC-305] Given a community with flights on Tuesday and Friday and a five-day grounding starting Monday (Monday to Friday counts as five days inclusive), then two missed flights are reported", () => {
    expect(missedFlights({ ...window, cover: [] })).toEqual({
      scheduled: ["2026-11-17", "2026-11-20"],
      missed: ["2026-11-17", "2026-11-20"],
      coveredBy: null,
      reasons: ["no aircraft and pilot at a listed base can cover"],
    });
    // A flight on the first and the last day both count.
    expect(
      missedFlights({ ...window, flightDays: ["Mon", "Fri"], cover: [] })
        .missed,
    ).toEqual(["2026-11-16", "2026-11-20"]);
  });

  it("[TC-315] Given a community whose rule file lists only base 1, then an available aircraft and qualified pilot at base 2 do not reduce its missed flights", () => {
    const result = missedFlights({
      ...window,
      cover: [
        {
          aircraftId: "SW-A02",
          baseId: "B02",
          pilotId: "PIL02",
          pilotStatus: "candidate",
          pilotMissingData: [],
        },
      ],
    });
    expect(result.missed).toEqual(["2026-11-17", "2026-11-20"]);
    expect(result.reasons).toEqual([
      "SW-A02 with PIL02 at B02 not counted: B02 is not listed to cover this community",
      "no aircraft and pilot at a listed base can cover",
    ]);
    // At a listed base, a candidate pilot covers every flight.
    const covered = missedFlights({
      ...window,
      cover: [
        {
          aircraftId: "SW-A03",
          baseId: "B01",
          pilotId: "PIL03",
          pilotStatus: "data_missing",
          pilotMissingData: ["availability not entered"],
        },
        {
          aircraftId: "SW-A04",
          baseId: "B01",
          pilotId: "PIL04",
          pilotStatus: "candidate",
          pilotMissingData: [],
        },
      ],
    });
    expect(covered).toEqual({
      scheduled: ["2026-11-17", "2026-11-20"],
      missed: [],
      coveredBy: { aircraftId: "SW-A04", pilotId: "PIL04" },
      reasons: [
        "SW-A03 with PIL03 at B01 not counted: pilot data missing (availability not entered)",
        "covered by SW-A04 with PIL04 at B01",
      ],
    });
  });

  it("[SYS-307] Given an excluded pilot at a listed base, then the cover is not counted, saying so", () => {
    const result = missedFlights({
      ...window,
      cover: [
        {
          aircraftId: "SW-A07",
          baseId: "B01",
          pilotId: "PIL07",
          pilotStatus: "excluded",
          pilotMissingData: [],
        },
      ],
    });
    expect(result.reasons).toEqual([
      "SW-A07 with PIL07 at B01 not counted: pilot excluded",
      "no aircraft and pilot at a listed base can cover",
    ]);
    // Everything missing is named.
    const twoMissing = missedFlights({
      ...window,
      cover: [
        {
          aircraftId: "SW-A08",
          baseId: "B01",
          pilotId: "PIL08",
          pilotStatus: "data_missing",
          pilotMissingData: [
            "currency not entered",
            "availability not entered",
          ],
        },
      ],
    });
    expect(twoMissing.reasons[0]).toBe(
      "SW-A08 with PIL08 at B01 not counted: pilot data missing (currency not entered; availability not entered)",
    );
  });

  it("[SYS-307] Given two aircraft and pilots able to cover, then the first entered is used and the flights are covered once", () => {
    const result = missedFlights({
      ...window,
      cover: [
        {
          aircraftId: "SW-A05",
          baseId: "B01",
          pilotId: "PIL05",
          pilotStatus: "candidate",
          pilotMissingData: [],
        },
        {
          aircraftId: "SW-A06",
          baseId: "B01",
          pilotId: "PIL06",
          pilotStatus: "candidate",
          pilotMissingData: [],
        },
      ],
    });
    expect(result.coveredBy).toEqual({
      aircraftId: "SW-A05",
      pilotId: "PIL05",
    });
    expect(result.reasons).toEqual(["covered by SW-A05 with PIL05 at B01"]);
  });

  it("[SYS-307] Given a one-day disruption, then that day's flight is counted", () => {
    expect(
      missedFlights({
        ...window,
        start: d("2026-11-17"),
        expectedEnd: d("2026-11-17"),
        cover: [],
      }).missed,
    ).toEqual(["2026-11-17"]);
  });

  it("[SYS-307] Given an expected end before the start, then it is refused", () => {
    expect(() =>
      missedFlights({ ...window, expectedEnd: d("2026-11-15"), cover: [] }),
    ).toThrow("expected end 2026-11-15 is before the start 2026-11-16");
  });
});

const option = (
  id: string,
  missed: number,
  ret: string | null,
  transfers: number,
  cost: string | null = null,
): PlanOption => ({
  id,
  missedFlights: missed,
  returnToService: ret === null ? null : d(ret),
  transfers,
  cost,
});

describe("SpareWing proposed plan", () => {
  it("[TC-308] Given five candidates, then the ranked proposal lists all five with the reasons for their order, and none is removed", () => {
    const ranked = rankOptions([
      option("A", 2, "2026-11-18", 0),
      option("B", 0, "2026-11-20", 1, "USD 400"),
      option("C", 0, "2026-11-19", 2),
      option("D", 1, null, 0),
      option("E", 0, "2026-11-19", 1),
    ]);
    expect(ranked.map((r) => r.option.id)).toEqual(["E", "C", "B", "D", "A"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(ranked[0]?.proposed).toBe(true);
    expect(ranked.slice(1).every((r) => !r.proposed)).toBe(true);
    expect(ranked.map((r) => r.reasons)).toEqual([
      [
        "0 missed flights, return to service 2026-11-19, 1 transfer",
        "proposed plan, for the flight base director, mechanic and pilot to review and verify",
      ],
      [
        "0 missed flights, return to service 2026-11-19, 2 transfers",
        "ranked below E: same missed flights and return to service, more transfers (2 against 1)",
      ],
      [
        "0 missed flights, return to service 2026-11-20, 1 transfer",
        "ranked below C: same missed flights, later return to service (2026-11-20 against 2026-11-19)",
        "cost USD 400 (shown, not ranked)",
      ],
      [
        "1 missed flight, return to service unknown, 0 transfers",
        "ranked below B: more missed flights (1 against 0)",
      ],
      [
        "2 missed flights, return to service 2026-11-18, 0 transfers",
        "ranked below D: more missed flights (2 against 1)",
      ],
    ]);
  });

  it("[TC-316] Given two options with the same number of missed flights, then the one with the earlier return to service ranks first; given two with the same missed flights and return date, then the one with fewer transfers ranks first; every option stays visible with its reasons", () => {
    expect(
      rankOptions([
        option("X", 1, "2026-11-21", 0),
        option("Y", 1, "2026-11-19", 3),
      ]).map((r) => r.option.id),
    ).toEqual(["Y", "X"]);
    expect(
      rankOptions([
        option("X", 1, "2026-11-19", 2),
        option("Y", 1, "2026-11-19", 1),
      ]).map((r) => r.option.id),
    ).toEqual(["Y", "X"]);
    // An unknown return to service ranks after a known one, and two unknowns tie on it.
    const unknowns = rankOptions([
      option("U1", 0, null, 1),
      option("K", 0, "2026-12-30", 3),
      option("U2", 0, null, 0),
    ]);
    expect(unknowns.map((r) => r.option.id)).toEqual(["K", "U2", "U1"]);
    expect(unknowns[1]?.reasons[1]).toBe(
      "ranked below K: same missed flights, return to service unknown",
    );
    expect(unknowns[2]?.reasons[1]).toBe(
      "ranked below U2: same missed flights and return to service, more transfers (1 against 0)",
    );
    // A full tie keeps the order entered, and says so.
    const tie = rankOptions([
      option("P", 0, "2026-11-19", 1),
      option("Q", 0, "2026-11-19", 1),
    ]);
    expect(tie.map((r) => r.option.id)).toEqual(["P", "Q"]);
    expect(tie[1]?.reasons[1]).toBe(
      "tied with P on every ranked criterion: kept in the order entered",
    );
    expect(rankOptions([])).toEqual([]);
  });

  it("[TC-309] Given any proposal, then nothing approves a schedule change or states that an aircraft is flightworthy, and a decision is recorded only when the flight base director, mechanic or pilot records it", () => {
    const texts = [
      ...rankOptions([
        option("A", 0, "2026-11-19", 1, "USD 1"),
        option("B", 1, null, 0),
      ]).flatMap((r) => r.reasons),
      ...findPartCandidates(NEED, [part()], [AIR]).candidates.flatMap((c) => [
        ...c.reasons,
        c.flag,
      ]),
      ...checkPilot(pilot(), PILOT_NEED).reasons,
      findPartCandidates(NEED, [], []).noCandidates?.message ?? "",
    ];
    for (const text of texts) {
      expect(text, text).not.toMatch(/approv|flightworth|airworth/i);
    }
    expect(DECIDING_ROLES).toEqual([
      "flight base director",
      "mechanic",
      "pilot",
    ]);
    for (const role of DECIDING_ROLES) {
      const result = recordDecision({
        optionId: "A",
        decision: "chosen",
        role,
        personId: "PER-1",
        time: "2026-11-16T14:00:00Z",
      });
      expect(result).toEqual({
        ok: true,
        entry: {
          time: "2026-11-16T14:00:00Z",
          actor: { kind: "person", personId: "PER-1" },
          action: `decision recorded by the ${role}: option A chosen`,
          before: null,
          after: { optionId: "A", decision: "chosen", role },
        },
      });
    }
    for (const role of ["team leader", "", "AI step"]) {
      expect(
        recordDecision({
          optionId: "A",
          decision: "rejected",
          role,
          personId: "PER-1",
          time: "2026-11-16T14:00:00Z",
        }),
      ).toEqual({
        ok: false,
        reason:
          "only the flight base director, mechanic or pilot records a decision",
      });
    }
    expect(
      recordDecision({
        optionId: "A",
        decision: "chosen",
        role: "mechanic",
        personId: " ",
        time: "2026-11-16T14:00:00Z",
      }),
    ).toEqual({
      ok: false,
      reason: "the person recording the decision is not identified",
    });
  });
});
