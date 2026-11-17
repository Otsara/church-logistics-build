// The claims nothing in the apps may make (SYS-309), checked in core so rule cards and AI text
// share one list (owner, 2026-11-16 and 2026-11-17; ADR-039, ADR-040, ADR-044).
import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_CLAIMS,
  FORBIDDEN_IN_WORDS,
  forbiddenClaims,
} from "../src/claims.ts";

describe("Forbidden claims", () => {
  it("[SYS-309] Given the list, then the prompts name every claim in one sentence", () => {
    expect(FORBIDDEN_CLAIMS).toEqual([
      "approved",
      "airworthy",
      "flightworthy",
      "safe to fly",
      "cleared",
      "ready to fly",
      "fit to fly",
    ]);
    expect(FORBIDDEN_IN_WORDS).toBe(
      "approved, airworthy, flightworthy, safe to fly, cleared, ready to fly or fit to fly",
    );
  });

  it("[SYS-309] Given any form or spelling of a claim, then it is found as written, in lower case, claim by claim", () => {
    expect(
      forbiddenClaims(
        "Flight-worthy, safe-to-fly and safe  to fly; awaiting approval; we approve; airworthiness.",
      ),
    ).toEqual([
      "approval",
      "approve",
      "airworthiness",
      "flight-worthy",
      "safe-to-fly",
      "safe  to fly",
    ]);
    expect(
      forbiddenClaims(
        "Approves, Cleared, clearance, flightworthy, Ready To Fly, ready-to-fly, fit to fly, fit for flight.",
      ),
    ).toEqual([
      "approves",
      "flightworthy",
      "cleared",
      "clearance",
      "ready to fly",
      "ready-to-fly",
      "fit to fly",
      "fit for flight",
    ]);
  });

  it("[SYS-309] Given words that only look alike, then no claim is found", () => {
    expect(
      forbiddenClaims(
        "It is clear; the reader is fit and well; unapproved; reapproval; a safe place to fly from; clearances-free.",
      ),
    ).toEqual([]);
  });
});
