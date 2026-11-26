/**
 * The pre-release confirmation run (DOC-070 §5; DAT-002; TC-034), with the owner present.
 *
 * Usage:
 *   node packages/synth/scripts/confirm-held-back.ts <held-back package> [--with-ai]
 *   node packages/synth/scripts/confirm-held-back.ts --development [--with-ai] [--first=N]   (rehearsal)
 *
 * 1. The package's SHA-256 must equal the committed manifest's, and every record its fingerprint;
 *    any difference stops the run before anything is read.
 * 2. Every Prepped scenario goes through core's rules (confirmPrepped).
 * 3. With --with-ai, the AI reads each scenario's donor lines through the gateway. In every line the
 *    check accepts, quantity, lot number and expiry must match the label; name, strength and form
 *    differences are counted (compareReadings; OD-068 a). Sign-in comes from CONFIRM_EMAIL and
 *    CONFIRM_PASSWORD, never from the command line or a file in the repository.
 * Exit code 0 only when nothing failed. The rehearsal reads the development two thirds only.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  checkDonorList,
  donorListStep,
} from "../../ai/src/steps/donor-list.ts";
import { gatewayClient } from "../../ai/src/gateway-client.ts";
import { runAiStep } from "../../ai/src/runner.ts";
import { AI_CALL_TIME_LIMIT_MS } from "../../ai/src/limits.ts";
import { compareReadings, confirmPrepped } from "../src/confirm.ts";
import type { PreppedData } from "../src/prepped.ts";
import { verifyManifest, type Manifest } from "../src/split.ts";
import { ROOT, sha256 } from "./io.ts";

// Lines per AI call: a longer list runs past the answer limit (MAX_OUTPUT_TOKENS) and falls back
// to manual entry, as it would on the screen.
const BATCH = 8;
type Scenario = { id: string; product: string; data: PreppedData };
const args = process.argv.slice(2);
const withAi = args.includes("--with-ai");
const rehearsal = args.includes("--development");
const target = args.find((a) => !a.startsWith("--"));
const out = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

const manifest = JSON.parse(
  readFileSync(join(ROOT, "data/synthetic/held-back-manifest.json"), "utf8"),
) as { packageSha256: string; prepped: Manifest; sparewing: Manifest };
const minimumDays = (
  JSON.parse(
    readFileSync(join(ROOT, "rules/prepped/shelf-life.json"), "utf8"),
  ) as {
    data: { minimum_days_at_arrival: number };
  }
).data.minimum_days_at_arrival;

let prepped: Scenario[];
if (rehearsal) {
  out("REHEARSAL on the development two thirds; no held-back data is read.");
  prepped = (
    JSON.parse(
      readFileSync(
        join(ROOT, "data/synthetic/development/prepped.json"),
        "utf8",
      ),
    ) as { scenarios: Scenario[] }
  ).scenarios;
  const first = args.find((a) => a.startsWith("--first="));
  if (first !== undefined) prepped = prepped.slice(0, Number(first.slice(8)));
} else {
  if (target === undefined)
    throw new Error("Give the held-back package path, or --development");
  const text = readFileSync(target, "utf8");
  const fingerprint = sha256(text);
  if (fingerprint !== manifest.packageSha256) {
    out(
      `STOP: package fingerprint ${fingerprint} differs from the manifest's ${manifest.packageSha256}.`,
    );
    process.exit(2);
  }
  const pkg = JSON.parse(text) as {
    prepped: Scenario[];
    sparewing: { id: string }[];
  };
  const problems = [
    ...verifyManifest(pkg.prepped, manifest.prepped),
    ...verifyManifest(pkg.sparewing, manifest.sparewing),
  ];
  if (problems.length > 0) {
    out(`STOP: records differ from the manifest: ${problems.join("; ")}`);
    process.exit(2);
  }
  out(
    `Fingerprints match: package ${fingerprint}; ${String(pkg.prepped.length)} Prepped and ${String(pkg.sparewing.length)} SpareWing records.`,
  );
  prepped = pkg.prepped;
}

let failed = 0;
let lotChecks = 0;
let trips = 0;
for (const s of prepped) {
  const r = confirmPrepped(s.id, s.data, minimumDays);
  lotChecks += r.lotChecks;
  trips += r.trips;
  failed += r.failures.length;
  for (const f of r.failures) out(`FAIL rules ${f}`);
}
out(
  `Rules: ${String(prepped.length)} scenarios, ${String(trips)} trips, ${String(lotChecks)} lot checks, ${String(failed)} failures.`,
);

if (withAi) {
  const url =
    process.env["SUPABASE_URL"] ?? "https://rrdozsrqveoemiqzjuya.supabase.co";
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const email = process.env["CONFIRM_EMAIL"];
  const password = process.env["CONFIRM_PASSWORD"];
  if (key === undefined || email === undefined || password === undefined)
    throw new Error(
      "Set SUPABASE_PUBLISHABLE_KEY, CONFIRM_EMAIL and CONFIRM_PASSWORD for --with-ai",
    );
  const signIn = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (signIn.status !== 200)
    throw new Error(`sign-in answered ${String(signIn.status)}`);
  const token = ((await signIn.json()) as { access_token: string })
    .access_token;
  const client = gatewayClient({
    url: `${url}/functions/v1/ai-gateway`,
    stepId: donorListStep.id,
    accessToken: () => Promise.resolve(token),
    fetch: (u, init) => fetch(u, init),
  });
  const totals = {
    lines: 0,
    exact: 0,
    flagged: 0,
    unread: 0,
    manual: 0,
    silent: 0,
    differences: 0,
  };
  for (const s of prepped) {
    for (let i = 0; i < s.data.lots.length; i += BATCH) {
      const lots = s.data.lots.slice(i, i + BATCH);
      const input = { lines: lots.map((l) => l.sourceLine) };
      const outcome = await runAiStep(donorListStep, input, {
        client,
        audit: (entry) => {
          if (process.env["CONFIRM_DEBUG"] !== undefined)
            out(JSON.stringify(entry).slice(0, 400));
        },
        timeoutMs: AI_CALL_TIME_LIMIT_MS,
        now: () => new Date().toISOString(),
        names: [],
      });
      totals.lines += lots.length;
      if (outcome.kind !== "ok") {
        totals.manual += lots.length;
        out(
          `${s.id} lines ${String(i + 1)}-${String(i + lots.length)}: manual entry (${outcome.reason})`,
        );
        continue;
      }
      const c = compareReadings(lots, checkDonorList(input, outcome.value));
      totals.exact += c.exact;
      totals.flagged += c.flagged;
      totals.unread += c.unread;
      totals.silent += c.silentErrors.length;
      totals.differences += c.differences.length;
      for (const e of c.silentErrors)
        out(`FAIL ai ${s.id} lines from ${String(i + 1)}: ${e}`);
    }
  }
  failed += totals.silent;
  out(
    `AI readings: ${String(totals.lines)} lines; ${String(totals.exact)} exact, ${String(totals.flagged)} flagged for a person, ${String(totals.unread)} unread, ${String(totals.manual)} sent to manual entry; ${String(totals.silent)} silent errors in quantity, lot number or expiry; ${String(totals.differences)} name, strength or form differences for the person's catalogue match.`,
  );
}
out(failed === 0 ? "RESULT: pass" : `RESULT: fail (${String(failed)})`);
process.exit(failed === 0 ? 0 : 1);
