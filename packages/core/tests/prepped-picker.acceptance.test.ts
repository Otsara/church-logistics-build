// The floor-list picker label for controlled medicines (SYS-118). Medicine names are real FDA
// directory names; the entries are built here, not taken from the catalogue file.
import { describe, expect, it } from "vitest";
import { CONTROLLED_LABEL, pickerLabel } from "../src/prepped/picker.ts";

describe("Floor-list picker", () => {
  it('[TC-132] Given a catalogue with a controlled medicine, when the lead clinician picks floor items, then it is labelled "Controlled: cannot be packed in this build" with its basis', () => {
    expect(CONTROLLED_LABEL).toBe("Controlled: cannot be packed in this build");
    expect(
      pickerLabel({
        controlled: "yes",
        controlledBasis: "FDA drug directory: DEA schedule CII",
      }),
    ).toEqual({
      label: "Controlled: cannot be packed in this build",
      basis: "FDA drug directory: DEA schedule CII",
    });
    // A medicine without a DEA schedule carries no label; its basis is still available.
    expect(
      pickerLabel({
        controlled: "no",
        controlledBasis:
          "FDA drug directory: no DEA schedule recorded (US scheduling only)",
      }),
    ).toBeNull();
  });
});
