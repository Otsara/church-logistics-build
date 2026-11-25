// Placeholders for screen behaviour tested in the Prepped Lovable project (Otsara/prepped,
// src/test/sync-fixes.test.tsx and the tests added with TC-147 to TC-149). This repository's
// vitest run does not include apps/, so these only register the test cases with `pnpm docs:check`.
// How the release gate counts those results is open (OD-067).
import { it } from "vitest";

it.todo(
  "[TC-145] Given a synced target change on an open floor list, then the box follows it, and leaving it untouched saves nothing (Otsara/prepped)",
);
it.todo(
  "[TC-146] Given audit entries that arrived out of time order, then the log lists them newest first (Otsara/prepped)",
);
it.todo(
  "[TC-147] Given another device's change to a trip, then the details form keeps it when the person saves their own (Otsara/prepped)",
);
it.todo(
  "[TC-148] Given a synced packing-list amount, then the box follows it until the person edits it (Otsara/prepped)",
);
it.todo(
  "[TC-149] Given unsaved letter text, then a synced draft does not overwrite it (Otsara/prepped)",
);
