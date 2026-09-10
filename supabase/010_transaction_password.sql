-- 010: the transaction password (the reference calls it that; CK44 shows it in
-- the Security Center as "Transaction Password").
--
-- A second, fund-only password. It is NOT the login password: a borrowed
-- phone that is already signed in still cannot move money without it. Once a
-- player sets one, the withdraw screen asks for it instead of the login
-- password; a player who has not set one keeps the old behaviour, so nobody
-- is locked out by this migration.
--
-- The hash never leaves the database. security_settings has RLS on and NO
-- select policy at all, so even the row's owner cannot read their own hash
-- through PostgREST — the three SECURITY DEFINER functions below are the
-- only way in. Hashing is bcrypt via pgcrypto (already enabled in schema.sql).
-- Safe to run more than once.

create table if not exists security_settings (
  user_id      uuid primary key references profiles(id) on delete cascade,
  txn_password text,                                    -- bcrypt hash, never the password
  updated_at   timestamptz not null default now()
);

alter table security_settings enable row level security;
-- deliberately no policies: nothing reaches this table except the functions.

revoke all on security_settings from public, anon, authenticated;

-- ---------- is one set? ----------
create or replace function has_transaction_password()
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return false;
  end if;
  return exists (
    select 1 from security_settings
     where user_id = uid and nullif(btrim(txn_password), '') is not null
  );
end;
$$;

-- ---------- set or change it ----------
-- The first time, p_old is ignored. After that it must match, which is what
-- stops a session left open on a shared phone from quietly replacing it.
create or replace function set_transaction_password(p_new text, p_old text default null)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  uid  uuid := auth.uid();
  cur  text;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;
  if p_new is null or length(p_new) < 6 then
    raise exception 'transaction password too short' using errcode = 'invalid_parameter_value';
  end if;

  select txn_password into cur from security_settings where user_id = uid for update;

  if nullif(btrim(cur), '') is not null then
    if p_old is null or cur <> crypt(p_old, cur) then
      raise exception 'current transaction password is wrong' using errcode = 'invalid_password';
    end if;
  end if;

  insert into security_settings (user_id, txn_password, updated_at)
       values (uid, crypt(p_new, gen_salt('bf')), now())
  on conflict (user_id) do update
      set txn_password = excluded.txn_password,
          updated_at   = now();
end;
$$;

-- ---------- check it ----------
-- Answers false rather than raising when none is set, so the caller can fall
-- back to the login password without having to ask twice.
create or replace function verify_transaction_password(p_password text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare
  uid uuid := auth.uid();
  cur text;
begin
  if uid is null or p_password is null then
    return false;
  end if;
  select txn_password into cur from security_settings where user_id = uid;
  if nullif(btrim(cur), '') is null then
    return false;
  end if;
  return cur = crypt(p_password, cur);
end;
$$;

revoke all on function has_transaction_password()                    from public, anon;
revoke all on function set_transaction_password(text, text)          from public, anon;
revoke all on function verify_transaction_password(text)             from public, anon;

grant execute on function has_transaction_password()           to authenticated;
grant execute on function set_transaction_password(text, text) to authenticated;
grant execute on function verify_transaction_password(text)    to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function has_transaction_password()           to service_role;
    grant execute on function set_transaction_password(text, text) to service_role;
    grant execute on function verify_transaction_password(text)    to service_role;
  end if;
end $$;
