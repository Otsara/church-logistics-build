// The Supabase transport (ARC-019; ADR-052): how the store's push and pull become calls to the
// database functions push_record and pull_records, and how their rows come back as records. The
// client here is a stand-in that answers as the functions do. Records are synthetic.
import { describe, expect, it } from "vitest";
import { supabaseTransport, type RpcClient } from "../src/supabase.ts";

const TEAM = "6f1c2f0e-0000-4000-8000-000000000001";

const client = (answer: {
  data: unknown;
  error: { message: string } | null;
}) => {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const rpc: RpcClient = {
    rpc: (fn, args) => {
      calls.push({ fn, args });
      return Promise.resolve(answer);
    },
  };
  return { rpc, calls };
};

const row = (
  accepted: boolean | undefined,
  extra: Record<string, unknown> = {},
) => ({
  ...(accepted === undefined ? {} : { accepted }),
  team_id: TEAM,
  kind: "lot",
  id: "L1",
  version: 2,
  data: { quantity: 400 },
  edited_by: "PER-A",
  edited_at: "2026-11-21T10:00:00+00:00",
  ...extra,
});

const EDIT = {
  kind: "lot",
  id: "L1",
  teamId: TEAM,
  baseVersion: 1,
  data: { quantity: 400 },
  editedBy: "PER-A",
  editedAt: "2026-11-21T10:00:00Z",
};

const RECORD = {
  kind: "lot",
  id: "L1",
  teamId: TEAM,
  version: 2,
  data: { quantity: 400 },
  updatedBy: "PER-A",
  updatedAt: "2026-11-21T10:00:00Z",
};

describe("Supabase transport", () => {
  it("[TC-001] Given an edit, then it is pushed with the version it was made from, and an accepted answer comes back as the record with its new version", async () => {
    const c = client({ data: [row(true)], error: null });
    const result = await supabaseTransport(c.rpc, TEAM).push(EDIT);
    expect(c.calls).toEqual([
      {
        fn: "push_record",
        args: {
          p_team: TEAM,
          p_kind: "lot",
          p_id: "L1",
          p_base_version: 1,
          p_data: { quantity: 400 },
          p_edited_by: "PER-A",
          p_edited_at: "2026-11-21T10:00:00Z",
        },
      },
    ]);
    expect(result).toEqual({ accepted: true, record: RECORD });
  });

  it("[TC-023] Given an edit made from an older version, then the server's current row comes back as a refusal, for the device to hold as a conflict", async () => {
    const c = client({ data: [row(false, { version: 3 })], error: null });
    expect(await supabaseTransport(c.rpc, TEAM).push(EDIT)).toEqual({
      accepted: false,
      current: { ...RECORD, version: 3 },
    });
  });

  it("[TC-024] Given a record the signed-in person's teams cannot see, then the push fails with a plain reason instead of being taken as a conflict", async () => {
    await expect(
      supabaseTransport(client({ data: [], error: null }).rpc, TEAM).push(EDIT),
    ).rejects.toThrow(
      "The server did not accept the change: the signed-in person is not in this record's team",
    );
  });

  it("[TC-024] Given the server reports an error, or answers with rows not shaped like records, then the sync stops with that reason", async () => {
    await expect(
      supabaseTransport(
        client({ data: null, error: { message: "JWT expired" } }).rpc,
        TEAM,
      ).push(EDIT),
    ).rejects.toThrow("JWT expired");
    await expect(
      supabaseTransport(
        client({ data: null, error: { message: "JWT expired" } }).rpc,
        TEAM,
      ).pull(0),
    ).rejects.toThrow("JWT expired");
    await expect(
      supabaseTransport(
        client({ data: [row(true, { version: "2" })], error: null }).rpc,
        TEAM,
      ).push(EDIT),
    ).rejects.toThrow("The server's answer was not in the expected form");
    await expect(
      supabaseTransport(
        client({ data: [row(true, { edited_at: "yesterday" })], error: null })
          .rpc,
        TEAM,
      ).push(EDIT),
    ).rejects.toThrow("The server's answer was not in the expected form");
    await expect(
      supabaseTransport(
        client({ data: { rows: [] }, error: null }).rpc,
        TEAM,
      ).pull(0),
    ).rejects.toThrow("The server's answer was not in the expected form");
  });

  it("[TC-001] Given records written since the cursor, then they come back in the server's order and the cursor moves to the last one; with none, it stays", async () => {
    const c = client({
      data: [
        row(undefined, { id: "L1", seq: 41 }),
        row(undefined, { id: "L2", version: 1, seq: 44 }),
      ],
      error: null,
    });
    const pulled = await supabaseTransport(c.rpc, TEAM).pull(40);
    expect(c.calls).toEqual([
      { fn: "pull_records", args: { p_team: TEAM, p_since: 40 } },
    ]);
    expect(pulled).toEqual({
      records: [RECORD, { ...RECORD, id: "L2", version: 1 }],
      cursor: 44,
    });
    expect(
      await supabaseTransport(client({ data: [], error: null }).rpc, TEAM).pull(
        44,
      ),
    ).toEqual({
      records: [],
      cursor: 44,
    });
  });
});
