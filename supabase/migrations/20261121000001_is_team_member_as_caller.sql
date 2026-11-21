-- The membership check runs with the caller's own rights (ADR-052; SEC-008). A person can already
-- see their own memberships, so the check needs no elevated rights, and Supabase's security
-- advisor no longer flags a callable SECURITY DEFINER function.
alter function public.is_team_member (uuid) security invoker;
