/**
 * The store's transport to the Supabase database functions push_record and pull_records
 * (supabase/migrations/20261121000000_records_and_sync.sql; ARC-019; ADR-052). The screens create
 * the Supabase client, signed in, and pass it here, so this package imports no network library
 * and the generated rules folder still imports nothing but zod (ADR-048). Every answer is checked
 * before it is used; anything unexpected stops the sync with a plain reason.
 */
import { z } from "zod";
import type { Transport } from "./engine.ts";
import type { PushResult, SyncedRecord } from "./sync.ts";

/** The one call the transport needs from a Supabase client: `supabase.rpc(fn, args)`. */
export interface RpcClient {
  rpc(
    fn: string,
    args: Record<string, unknown>,
  ): PromiseLike<{
    readonly data: unknown;
    readonly error: { readonly message: string } | null;
  }>;
}

const time = z.string().refine((value) => !Number.isNaN(Date.parse(value)));

const recordRow = z.object({
  team_id: z.string(),
  kind: z.string(),
  id: z.string(),
  version: z.number().int().min(1),
  data: z.unknown(),
  edited_by: z.string(),
  edited_at: time,
});

const pushRows = z.array(recordRow.extend({ accepted: z.boolean() }));
const pullRows = z.array(recordRow.extend({ seq: z.number().int() }));

const FORM = "The server's answer was not in the expected form";

/** A time as the database gives it ("…+00:00"), as the store keeps it ("…Z", whole seconds). */
const utc = (value: string): string =>
  `${new Date(value).toISOString().slice(0, 19)}Z`;

const toRecord = (r: z.infer<typeof recordRow>): SyncedRecord => ({
  kind: r.kind,
  id: r.id,
  teamId: r.team_id,
  version: r.version,
  data: r.data,
  updatedBy: r.edited_by,
  updatedAt: utc(r.edited_at),
});

async function call(
  client: RpcClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const { data, error } = await client.rpc(fn, args);
  if (error !== null) throw new Error(error.message);
  return data;
}

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new Error(FORM);
  return parsed.data;
}

export function supabaseTransport(
  client: RpcClient,
  teamId: string,
): Transport {
  return {
    push: async (edit): Promise<PushResult> => {
      const rows = parse(
        pushRows,
        await call(client, "push_record", {
          p_team: teamId,
          p_kind: edit.kind,
          p_id: edit.id,
          p_base_version: edit.baseVersion,
          p_data: edit.data,
          p_edited_by: edit.editedBy,
          p_edited_at: edit.editedAt,
        }),
      );
      const [first] = rows;
      if (first === undefined) {
        // The database rules hide records of teams the person is not in, so nothing comes back.
        throw new Error(
          "The server did not accept the change: the signed-in person is not in this record's team",
        );
      }
      return first.accepted
        ? { accepted: true, record: toRecord(first) }
        : { accepted: false, current: toRecord(first) };
    },
    pull: async (since) => {
      const rows = parse(
        pullRows,
        await call(client, "pull_records", { p_team: teamId, p_since: since }),
      );
      return {
        records: rows.map(toRecord),
        cursor: rows.reduce((max, r) => Math.max(max, r.seq), since),
      };
    },
  };
}
