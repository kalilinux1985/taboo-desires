-- Keep future objects closed to the browser roles, like the tables already are.
-- The init schema revoked default table grants; Supabase still hands anon and
-- authenticated EXECUTE on new public functions and full use of new sequences.

do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('alter default privileges in schema public revoke all on functions from %I', r);
      execute format('alter default privileges in schema public revoke all on sequences from %I', r);
      execute format('revoke all on all sequences in schema public from %I', r);
    end if;
  end loop;
end;
$$;
