-- TC-024 against the database (SEC-008; ADR-052, ADR-053): run in the Supabase SQL editor, or
-- through the Supabase tools, by the database owner. It acts as the demo team's two accounts,
-- found by their person ids, and always ends by raising its results, which rolls everything back.
-- Expected: 1 accepted v=1; 2 accepted v=2; 3 refused with v=2 and the stored data; 4 and 5
-- refused; 6 and 6b no rows; 7 no rows deleted; 8 one membership visible, own roles unchanged;
-- 9 the pharmacist pulls the lead's record.
do $$
declare
  team uuid;
  lead uuid;
  pharm uuid;
  other uuid := '00000000-0000-4000-8000-000000000099';
  out text := '';
  r record;
  n int;
begin
  select m.team_id, m.user_id into team, lead from public.team_members m where m.person_id = 'p-ainsley';
  select m.user_id into pharm from public.team_members m where m.team_id = team and m.person_id = 'p-castellan';

  insert into public.records (team_id, kind, id, version, data, edited_by, edited_at, written_by)
  values (other, 'lot', 'X1', 1, '{"q":1}', 'p-other', now(), lead);

  perform set_config('request.jwt.claims', json_build_object('sub', lead, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select * into r from public.push_record(team, 'lot', 'L1', 0, '{"q":700}', 'p-ainsley', now());
  out := out || format('1 new: accepted=%s v=%s; ', r.accepted, r.version);
  select * into r from public.push_record(team, 'lot', 'L1', 1, '{"q":400}', 'p-ainsley', now());
  out := out || format('2 edit: accepted=%s v=%s; ', r.accepted, r.version);
  select * into r from public.push_record(team, 'lot', 'L1', 1, '{"q":650}', 'p-ainsley', now());
  out := out || format('3 stale: accepted=%s v=%s data=%s; ', r.accepted, r.version, r.data);
  begin
    perform public.push_record(team, 'lot', 'L2', 0, '{}', 'p-castellan', now());
    out := out || '4 other person: NOT REFUSED; ';
  exception when insufficient_privilege then
    out := out || '4 other person: refused (' || sqlerrm || '); ';
  end;
  begin
    perform public.push_record(other, 'lot', 'X1', 1, '{}', 'p-ainsley', now());
    out := out || '5 other team push: NOT REFUSED; ';
  exception when insufficient_privilege then
    out := out || '5 other team push: refused (' || sqlerrm || '); ';
  end;
  select count(*) into n from public.pull_records(other, 0);
  out := out || format('6 other team pull rows=%s; ', n);
  select count(*) into n from public.records where team_id = other;
  out := out || format('6b other team direct read rows=%s; ', n);
  delete from public.records where team_id = team;
  get diagnostics n = row_count;
  out := out || format('7 delete rows=%s; ', n);
  select count(*) into n from public.team_members;
  out := out || format('8 memberships visible=%s; ', n);
  update public.team_members set roles = array['team leader'] where user_id = lead;
  get diagnostics n = row_count;
  out := out || format('8b own roles changed rows=%s; ', n);

  perform set_config('request.jwt.claims', json_build_object('sub', pharm, 'role', 'authenticated')::text, true);
  select count(*) into n from public.pull_records(team, 0);
  out := out || format('9 pharmacist pulls rows=%s', n);

  raise exception 'RESULTS (rolled back): %', out;
end;
$$;
