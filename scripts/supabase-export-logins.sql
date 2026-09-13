-- Hands the players' login hashes to the service key, for
-- scripts/import-supabase.mjs. Run in the Supabase SQL editor before the
-- import. Nobody but the service role can call it.
--
-- The hashes are bcrypt ($2a$…), which the new login checks as they are,
-- so every player keeps their password.

create or replace function public.sk88bd_export_logins()
returns table (id uuid, encrypted_password text)
language sql
security definer
set search_path = auth, public
as $$
  select u.id, u.encrypted_password::text from auth.users u;
$$;

revoke all on function public.sk88bd_export_logins() from public, anon, authenticated;
grant execute on function public.sk88bd_export_logins() to service_role;

notify pgrst, 'reload schema';

-- After the import, remove it:
--   drop function if exists public.sk88bd_export_logins();
