-- Team sync for the offline store (ARC-006, ARC-019; SYS-007, SEC-008; owner, 2026-11-21; ADR-052).
--
-- Every synced thing is a row in public.records: one per team, kind and id, with the version the
-- server gave it. A person reads and writes only the records of the teams they belong to
-- (public.team_members), and only through the two functions below. push_record accepts an edit
-- only if the version it was made from is still the current one; otherwise it answers with the
-- current row, and the device holds a conflict for a person (OD-017). Every row records the
-- signed-in user who wrote it, whatever the app says.

create table public.team_members (
  team_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (team_id, user_id)
);

alter table public.team_members enable row level security;

create policy "a person sees only their own memberships"
  on public.team_members for select
  to authenticated
  using (user_id = (select auth.uid()));

-- No insert, update or delete policy: memberships are set by the owner in the dashboard.

create sequence public.records_seq;

create table public.records (
  team_id uuid not null,
  kind text not null check (char_length(kind) between 1 and 64),
  id text not null check (char_length(id) between 1 and 200),
  version integer not null check (version >= 1),
  data jsonb not null,
  edited_by text not null check (char_length(edited_by) between 1 and 200),
  edited_at timestamptz not null,
  written_by uuid not null default auth.uid () references auth.users (id),
  seq bigint not null default nextval('public.records_seq'),
  primary key (team_id, kind, id)
);

create index records_team_seq on public.records (team_id, seq);

alter table public.records enable row level security;

create function public.is_team_member (p_team uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
  as $$
    select exists (
      select 1 from public.team_members m
      where m.team_id = p_team and m.user_id = (select auth.uid ())
    );
  $$;

revoke all on function public.is_team_member (uuid) from public, anon;
grant execute on function public.is_team_member (uuid) to authenticated;

create policy "a team reads its own records"
  on public.records for select
  to authenticated
  using (public.is_team_member (team_id));

create policy "a team adds its own records"
  on public.records for insert
  to authenticated
  with check (public.is_team_member (team_id) and written_by = (select auth.uid ()));

create policy "a team changes its own records"
  on public.records for update
  to authenticated
  using (public.is_team_member (team_id))
  with check (public.is_team_member (team_id) and written_by = (select auth.uid ()));

-- No delete policy: records are never deleted through the app.

-- Pushes one edit. Accepted only if p_base_version is the current version (0 for a new record);
-- then the row gets the next version. Otherwise nothing changes and the current row comes back.
create function public.push_record (
  p_team uuid,
  p_kind text,
  p_id text,
  p_base_version integer,
  p_data jsonb,
  p_edited_by text,
  p_edited_at timestamptz
)
  returns table (
    accepted boolean,
    team_id uuid,
    kind text,
    id text,
    version integer,
    data jsonb,
    edited_by text,
    edited_at timestamptz
  )
  language plpgsql
  security invoker
  set search_path = ''
  as $$
  begin
    if p_base_version = 0 then
      return query
        insert into public.records as r (team_id, kind, id, version, data, edited_by, edited_at)
        values (p_team, p_kind, p_id, 1, p_data, p_edited_by, p_edited_at)
        on conflict do nothing
        returning true, r.team_id, r.kind, r.id, r.version, r.data, r.edited_by, r.edited_at;
    else
      return query
        update public.records as r
        set version = r.version + 1,
            data = p_data,
            edited_by = p_edited_by,
            edited_at = p_edited_at,
            written_by = auth.uid (),
            seq = nextval('public.records_seq')
        where r.team_id = p_team and r.kind = p_kind and r.id = p_id
          and r.version = p_base_version
        returning true, r.team_id, r.kind, r.id, r.version, r.data, r.edited_by, r.edited_at;
    end if;
    if not found then
      return query
        select false, r.team_id, r.kind, r.id, r.version, r.data, r.edited_by, r.edited_at
        from public.records as r
        where r.team_id = p_team and r.kind = p_kind and r.id = p_id;
    end if;
  end;
  $$;

-- Every record of the team written after p_since, in the order written, with its sequence number.
create function public.pull_records (p_team uuid, p_since bigint)
  returns table (
    team_id uuid,
    kind text,
    id text,
    version integer,
    data jsonb,
    edited_by text,
    edited_at timestamptz,
    seq bigint
  )
  language sql
  stable
  security invoker
  set search_path = ''
  as $$
    select r.team_id, r.kind, r.id, r.version, r.data, r.edited_by, r.edited_at, r.seq
    from public.records as r
    where r.team_id = p_team and r.seq > p_since
    order by r.seq;
  $$;

revoke all on function public.push_record (uuid, text, text, integer, jsonb, text, timestamptz) from public, anon;
revoke all on function public.pull_records (uuid, bigint) from public, anon;
grant execute on function public.push_record (uuid, text, text, integer, jsonb, text, timestamptz) to authenticated;
grant execute on function public.pull_records (uuid, bigint) to authenticated;
