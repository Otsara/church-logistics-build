// Golden examples for the donor-list (AIC-101) and parts-email (AIC-301) readers, from the
// development partition only (DAT-004). A recorded answer is run through the runner and the
// checks exactly as in the app, with no model call (ARC-010). Until an example is recorded, its
// recorded test is a placeholder.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runAiStep } from "../src/runner.ts";
import type { AiDependencies, AiStep } from "../src/step.ts";
import { checkDonorList, donorListStep } from "../src/steps/donor-list.ts";
import { checkPartsEmail, partsEmailStep } from "../src/steps/parts-email.ts";

const ROOT = join(import.meta.dirname, "../../..");
const json = (path: string): unknown =>
  JSON.parse(readFileSync(join(ROOT, path), "utf8"));

interface Example<E> {
  readonly id: string;
  readonly source: {
    readonly scenario: string;
    readonly records: readonly string[];
  };
  readonly lines: readonly string[];
  readonly expected: readonly E[];
  readonly recorded: { readonly text: string } | null;
}
interface File<E> {
  readonly synthetic: boolean;
  readonly partition: string;
  readonly examples: readonly Example<E>[];
}
interface DonorExpected {
  readonly line: number;
  readonly genericName: string;
  readonly quantity: number;
  readonly lotNumber: string | null;
  readonly expiry: string | null;
  readonly needsReview: boolean;
}
interface PartExpected {
  readonly line: number;
  readonly partNumber: string;
  readonly quantity: number | null;
  readonly description: string | null;
  readonly needsReview: boolean;
}

const donors = json(
  "packages/ai/golden/aic-101-donor-list.json",
) as File<DonorExpected>;
const parts = json(
  "packages/ai/golden/aic-301-parts-email.json",
) as File<PartExpected>;
const heldBack = json("data/synthetic/held-back-manifest.json") as Record<
  "prepped" | "sparewing",
  { records: readonly { id: string }[] }
>;

/** Runs a recorded answer through the runner with no model call. */
async function replay<I, O>(step: AiStep<I, O>, input: I, text: string) {
  const deps: AiDependencies = {
    client: { complete: () => Promise.resolve(text) },
    audit: () => undefined,
    timeoutMs: 1000,
    now: () => "2026-11-16T00:00:00Z",
    names: [],
  };
  return runAiStep(step, input, deps);
}

describe("Golden examples", () => {
  it("[TC-022] Given the golden example files and the held-back manifest, then no golden example comes from a held-back record", () => {
    const held = new Set(
      [...heldBack.prepped.records, ...heldBack.sparewing.records].map(
        (r) => r.id,
      ),
    );
    expect(held.size).toBeGreaterThan(0);
    for (const e of [...donors.examples, ...parts.examples]) {
      expect(held.has(e.source.scenario), e.id).toBe(false);
    }
    expect([donors.partition, parts.partition]).toEqual([
      "development",
      "development",
    ]);
    expect([donors.synthetic, parts.synthetic]).toEqual([true, true]);
  });

  it("[TC-137, TC-311] Given each step, then it has 10 to 20 examples, each expected line points at a real line, and the mix includes lines that must need review", () => {
    for (const file of [donors, parts] as File<{
      line: number;
      needsReview: boolean;
    }>[]) {
      expect(file.examples.length).toBeGreaterThanOrEqual(10);
      expect(file.examples.length).toBeLessThanOrEqual(20);
      for (const e of file.examples) {
        for (const x of e.expected)
          expect(e.lines[x.line - 1], e.id).toBeDefined();
      }
      expect(
        file.examples.flatMap((e) => e.expected).some((x) => x.needsReview),
      ).toBe(true);
    }
  });

  const recordedDonors = donors.examples.filter((e) => e.recorded !== null);
  if (recordedDonors.length === 0) {
    it.todo(
      "[TC-137] Given the recorded golden donor lists, then each reads as expected (waiting for recordings)",
    );
  }
  for (const e of recordedDonors) {
    it(`[TC-137] Given recorded donor list ${e.id}, then each expected line is read with its quantity, lot number, expiry and review flag`, async () => {
      const input = { lines: e.lines };
      const outcome = await replay(
        donorListStep,
        input,
        e.recorded?.text ?? "",
      );
      expect(outcome.kind, "the recorded answer passes the schema").toBe("ok");
      if (outcome.kind !== "ok") return;
      const result = checkDonorList(input, outcome.value);
      for (const x of e.expected) {
        const got = result.lines.find((l) => l.line === x.line);
        expect(got, `line ${String(x.line)}`).toBeDefined();
        expect(
          [got?.quantity, got?.lotNumber, got?.expiry, got?.needsReview],
          `line ${String(x.line)}`,
        ).toEqual([x.quantity, x.lotNumber, x.expiry, x.needsReview]);
        const firstWord = x.genericName.split(" ")[0]?.toLowerCase() ?? "";
        expect(
          got?.genericName?.toLowerCase().startsWith(firstWord),
          `line ${String(x.line)} name`,
        ).toBe(true);
      }
    });
  }

  const recordedParts = parts.examples.filter((e) => e.recorded !== null);
  if (recordedParts.length === 0) {
    it.todo(
      "[TC-311] Given the recorded golden parts emails, then each reads as expected (waiting for recordings)",
    );
  }
  for (const e of recordedParts) {
    it(`[TC-311] Given recorded parts email ${e.id}, then each expected part is read with its number, quantity, description and review flag`, async () => {
      const input = { lines: e.lines };
      const outcome = await replay(
        partsEmailStep,
        input,
        e.recorded?.text ?? "",
      );
      expect(outcome.kind, "the recorded answer passes the schema").toBe("ok");
      if (outcome.kind !== "ok") return;
      const result = checkPartsEmail(input, outcome.value);
      for (const x of e.expected) {
        const got = result.lines.find((l) => l.line === x.line);
        expect(
          [got?.partNumber, got?.quantity, got?.description, got?.needsReview],
          `line ${String(x.line)}`,
        ).toEqual([x.partNumber, x.quantity, x.description, x.needsReview]);
      }
    });
  }

  it("[TC-311] Given a recorded answer that is not valid, then the person is sent to manual entry", async () => {
    const example = parts.examples[0];
    expect(example).toBeDefined();
    const outcome = await replay(
      partsEmailStep,
      { lines: example?.lines ?? [] },
      "Here are the parts: SWP-1155-6",
    );
    expect(outcome).toMatchObject({
      kind: "manual_entry",
      reason: "invalid_output",
    });
  });
});
