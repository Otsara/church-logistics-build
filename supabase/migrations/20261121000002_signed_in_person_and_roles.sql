-- The signed-in person and their roles come from the team membership the owner sets (SYS-010,
-- SEC-008; owner, 2026-11-21; ADR-053, REV-017). Without this, a signed-in person could act as
-- anyone, including the lead clinician who signs off the packing list. Memberships are still set
-- only by the owner in the dashboard; no one can change their own person or roles through the app.

alter table public.team_members
  add column person_id text not null check (char_length(person_id) between 1 and 200),
  add column roles text[] not null default '{}'
    check (roles <@ array['trip coordinator', 'lead clinician', 'team leader', 'team member']);

create unique index team_members_one_account_per_person on public.team_members (team_id, person_id);

-- push_record now refuses a change recorded under anyone but the signed-in person.
create or replace function public.push_record (
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
  declare
    v_person text;
  begin
    select m.person_id into v_person
    from public.team_members as m
    where m.team_id = p_team and m.user_id = (select auth.uid ());
    if v_person is null then
      raise exception 'The signed-in person is not in this record''s team'
        using errcode = '42501';
    end if;
    if p_edited_by is distinct from v_person then
      raise exception 'A change is recorded only under the signed-in person'
        using errcode = '42501';
    end if;
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
