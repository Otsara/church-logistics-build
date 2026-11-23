-- TC-023 against the database (ARC-019; ADR-052): two signed-in people edit the same record from
-- the same version, as two devices do when one is offline. Run by the database owner through the
-- Supabase tools; it always ends by raising its results, which rolls everything back.
-- Expected: 1 the lead creates v=1; 2 the pharmacist pulls it at v=1; 3 the lead edits v=1 -> v=2;
-- 4 the pharmacist's edit made from v=1 is refused, and the server answers with v=2 and the
-- lead's data and editor, for the device to hold as "Conflict: check"; 5 the pharmacist settles
-- it from v=2, accepted as v=3 with the pharmacist's data; 6 the lead pulls v=3 written by the
-- pharmacist, with a sequence number after the lead's own.
do $$
declare
  team uuid;
  lead uuid;
  pharm uuid;
  out text := '';
  r record;
  seq_lead bigint;
begin
  select m.team_id, m.user_id into team, lead from public.team_members m where m.person_id = 'p-ainsley';
  select m.user_id into pharm from public.team_members m where m.team_id = team and m.person_id = 'p-castellan';

  set local role authenticated;
  -- 1 The lead creates the record.
  perform set_config('request.jwt.claims', json_build_object('sub', lead, 'role', 'authenticated')::text, true);
  select * into r from public.push_record(team, 'test', 'TWO-DEVICE-1', 0, '{"target":200}', 'p-ainsley', now());
  out := out || format('1 lead creates: accepted=%s v=%s; ', r.accepted, r.version);

  -- 2 The pharmacist's device pulls it.
  perform set_config('request.jwt.claims', json_build_object('sub', pharm, 'role', 'authenticated')::text, true);
  select * into r from public.pull_records(team, 0) p where p.id = 'TWO-DEVICE-1';
  out := out || format('2 pharmacist pulls: v=%s data=%s; ', r.version, r.data);

  -- 3 The lead, online, edits it.
  perform set_config('request.jwt.claims', json_build_object('sub', lead, 'role', 'authenticated')::text, true);
  select * into r from public.push_record(team, 'test', 'TWO-DEVICE-1', 1, '{"target":250}', 'p-ainsley', now());
  out := out || format('3 lead edits: accepted=%s v=%s; ', r.accepted, r.version);
  select p.seq into seq_lead from public.pull_records(team, 0) p where p.id = 'TWO-DEVICE-1';

  -- 4 The pharmacist, back online, pushes an edit made offline from v=1.
  perform set_config('request.jwt.claims', json_build_object('sub', pharm, 'role', 'authenticated')::text, true);
  select * into r from public.push_record(team, 'test', 'TWO-DEVICE-1', 1, '{"target":300}', 'p-castellan', now());
  out := out || format('4 pharmacist stale edit: accepted=%s v=%s data=%s by=%s; ', r.accepted, r.version, r.data, r.edited_by);

  -- 5 The pharmacist chooses their own version: a new edit from v=2.
  select * into r from public.push_record(team, 'test', 'TWO-DEVICE-1', 2, '{"target":300}', 'p-castellan', now());
  out := out || format('5 pharmacist settles: accepted=%s v=%s data=%s; ', r.accepted, r.version, r.data);

  -- 6 The lead's device pulls what changed since its own edit.
  perform set_config('request.jwt.claims', json_build_object('sub', lead, 'role', 'authenticated')::text, true);
  select * into r from public.pull_records(team, seq_lead) p where p.id = 'TWO-DEVICE-1';
  out := out || format('6 lead pulls: v=%s data=%s by=%s after own seq=%s', r.version, r.data, r.edited_by, r.seq > seq_lead);

  raise exception 'RESULTS (rolled back): %', out;
end;
$$;
