// Prepped acceptance tests from DOC-070 that span more than one rule: the destination rule card,
// the floor assessment and the checklist together (CLAUDE.md rule 1). Every card, lot and
// quantity is synthetic.
import { describe, expect, it } from "vitest";
import { parseIsoDate } from "../src/dates.ts";
import {
  SYNTHETIC_CARD_LABEL,
  checklist,
  readDestinationCard,
  requiredDocuments,
} from "../src/prepped/destination-card.ts";
import { checkLot } from "../src/prepped/eligibility.ts";
import { assessFloor } from "../src/prepped/floor.ts";

const CARD = JSON.stringify({
  id: "destination-testland",
  product: "prepped",
  title: "Destination rule card: Testland (synthetic example)",
  status: "placeholder",
  source: {
    url: "https://example.org/synthetic/destination-testland",
    verified_date: null,
    verified_by: null,
  },
  data: {
    country: "Testland",
    synthetic: true,
    items: [
      {
        id: "TL-01",
        requirement: "An import permit is prepared before shipping.",
        document: "Import permit",
        label: SYNTHETIC_CARD_LABEL,
      },
    ],
  },
});

const LOT = {
  lotId: "lot-1",
  lotNumber: "AMX2291",
  donorId: "D001",
  manufacturer: "Synthetic Maker A",
  catalogEntryId: "E-AMOX",
  genericName: "Amoxicillin",
  dosageForm: "CAPSULE",
  strength: "500 mg",
  quantity: 300,
  eligibility: checkLot(
    {
      id: "lot-1",
      expiry: "2028-09-30",
      controlled: "no",
      controlledBasis: "FDA drug directory: no DEA schedule recorded",
      coldChain: false,
      inScope: true,
      scopeReason: null,
    },
    {
      arrival: parseIsoDate("2026-12-01"),
      checkDate: parseIsoDate("2026-11-11"),
      minimumDaysAtArrival: 365,
    },
  ),
  classes: [],
};

describe("Prepped acceptance", () => {
  it('[TC-105] Given a destination card that requires an import permit and no permit marked obtained, then the indicator shows "No go" and lists the missing permit, the meter shows its percentage as usual, and the document draft lists the missing permit', () => {
    const read = readDestinationCard(CARD);
    if (!read.ok) throw new Error(read.errors.join("; "));
    const card = read.card;
    const documents = (prepared: boolean) =>
      requiredDocuments(card).map((doc) => ({
        id: doc.cardItemId,
        name: doc.name,
        prepared,
        reviewed: prepared,
      }));
    const assess = (prepared: boolean) =>
      assessFloor({
        floorItems: [
          {
            id: "F1",
            catalogEntryId: "E-AMOX",
            genericName: "Amoxicillin",
            target: 200,
            priority: 1,
          },
        ],
        lots: [LOT],
        acceptedExchanges: [],
        requiredDocuments: documents(prepared),
      });

    const missing = assess(false);
    expect(missing.indicator).toBe("No go");
    expect(missing.shortages).toEqual([]);
    expect(missing.missingDocuments).toEqual([
      { documentId: "TL-01", name: "Import permit", reason: "not prepared" },
    ]);
    // The meter still shows the floor fully covered; only the documents part is empty.
    expect(missing.meter.coverage).toBe(1);
    expect(missing.meter.documents).toBe(0);
    expect(checklist(card, new Set())).toContain(
      `TL-01: An import permit is prepared before shipping. Import permit: missing. (${SYNTHETIC_CARD_LABEL})`,
    );

    const obtained = assess(true);
    expect(obtained.indicator).toBe("Go");
    expect(obtained.meter.documents).toBe(1);
    expect(checklist(card, new Set(["TL-01"]))).toContain(
      `TL-01: An import permit is prepared before shipping. Import permit: prepared. (${SYNTHETIC_CARD_LABEL})`,
    );
  });

  it.todo(
    "[TC-126] Given an anticipated caseload, then any estimated quantity is labelled as an estimate and the target stays empty until the clinician accepts or changes it",
  );
});
