// How a readiness meter value is shown: acceptance test from DOC-070 (TC-150, SYS-106).
import { describe, expect, it } from "vitest";
import { meterText } from "../src/prepped/floor.ts";

describe("Meter values on screen (SYS-106)", () => {
  it("[TC-150] Given meter values, then each is shown to 2 decimal places, rounded down, and a value a hair below a hundredth shows that hundredth", () => {
    expect(meterText(0.8999999999999999)).toBe("0.90");
    expect(meterText(0.5249999999999999)).toBe("0.52");
    expect(meterText(0.999)).toBe("0.99");
    expect(meterText(0.6666666666666666)).toBe("0.66");
    expect(meterText(1)).toBe("1.00");
    expect(meterText(0)).toBe("0.00");
  });
});
