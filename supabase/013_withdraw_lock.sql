-- 013: withdraw lock, and the player's appeal against it.
--
-- What the operator asked for (2026-09-11): an admin or an agent can LOCK a
-- player. A locked player still signs in, deposits, plays and claims bonuses
-- exactly as before — the one thing refused is a withdrawal. Their My
-- Account screen shows why, and they can send an appeal; the admin reads it
-- and either unlocks the account or turns the appeal down.
--
-- That is narrower than HOLD (012), which stops every money movement, and
-- BAN, which shuts the account. All three sit side by side.
--
-- Needs 012. Safe to run more than once.

-- ============================================================
-- 1. The switch, on the profile
-- ============================================================
-- Players cannot write these: 012 left them UPDATE on contact columns only.

alter table profiles add column if not exists withdraw_locked boolean not null default false;
alter table profiles add column if not exists lock_reason     text;
alter table profiles add column if not exists locked_at       timestamptz;
alter table profiles add column if not exists locked_by       text;

create index if not exists profiles_withdraw_locked on profiles (locked_at desc) where withdraw_locked;

-- ============================================================
-- 2. Appeals
-- ============================================================
-- Written by the server (/api/account/lock) with the service role, after it
-- has checked the player is signed in and actually locked. A player reads
-- their own; nobody writes from a browser.

create table if not exists account_appeals (
  id          bigserial primary key,
  user_id     uuid not null references profiles(id) on delete cascade,
  message     text not null check (char_length(message) between 1 and 500),
  state       text not null default 'pending' check (state in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  admin_note  text
);

create index if not exists account_appeals_user on account_appeals (user_id, created_at desc);
-- one open appeal at a time: a second tap on "Appeal" cannot pile them up
create unique index if not exists account_appeals_one_pending on account_appeals (user_id) where state = 'pending';

alter table account_appeals enable row level security;

drop policy if exists "read own appeals" on account_appeals;
create policy "read own appeals" on account_appeals
  for select using (user_id = auth.uid() or is_admin());

revoke insert, update, delete on account_appeals from anon, authenticated;

-- ============================================================
-- 3. request_withdrawal refuses a locked account
-- ============================================================
-- The same function as 012, with one check added after the hold/ban one.
-- /api/withdraw/request asks first and says it in the player's words; this
-- is the database making sure.

create or replace function request_withdrawal(
  p_user uuid, p_channel text, p_amount bigint, p_account_no text, p_password text
) returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare
  uid        uuid := p_user;
  blk        text;
  txn        text;
  login_hash text;
  t_need     bigint;
  t_done     bigint;
  new_id     bigint;
begin
  if uid is null then
    raise exception 'no player' using errcode = 'insufficient_privilege';
  end if;
  blk := account_block(uid);
  if blk is not null then
    raise exception 'account %', blk using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from profiles where id = uid and withdraw_locked) then
    raise exception 'account locked' using errcode = 'insufficient_privilege';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive' using errcode = 'invalid_parameter_value';
  end if;
  if coalesce(btrim(p_account_no), '') = '' then
    raise exception 'account number required' using errcode = 'invalid_parameter_value';
  end if;

  select turnover_need, turnover_done into t_need, t_done from wallets where user_id = uid;
  if coalesce(t_need, 0) > coalesce(t_done, 0) then
    raise exception 'turnover left %', t_need - t_done using errcode = 'invalid_parameter_value';
  end if;

  select txn_password into txn from security_settings where user_id = uid;
  if nullif(btrim(txn), '') is not null then
    if p_password is null or txn <> crypt(p_password, txn) then
      raise exception 'wrong password' using errcode = 'invalid_password';
    end if;
  else
    select encrypted_password into login_hash from auth.users where id = uid;
    if p_password is null or login_hash is null or login_hash <> crypt(p_password, login_hash) then
      raise exception 'wrong password' using errcode = 'invalid_password';
    end if;
  end if;

  -- balance >= 0 is a check constraint, so an over-draw aborts here
  perform wallet_apply(uid, 'withdraw', -p_amount, 'withdraw:pending');

  insert into withdrawals (user_id, channel_id, amount, account_no)
  values (uid, p_channel, p_amount, btrim(p_account_no))
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function request_withdrawal(uuid, text, bigint, text, text) from public, anon, authenticated;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function request_withdrawal(uuid, text, bigint, text, text) to service_role;
    grant select, insert, update, delete on account_appeals to service_role;
    grant usage, select on sequence account_appeals_id_seq to service_role;
  end if;
end $$;

-- PostgREST picks up the new table and columns without a restart
notify pgrst, 'reload schema';

-- What you should see: the four new columns and the table.
select 'profiles.' || column_name as added
  from information_schema.columns
 where table_schema = 'public' and table_name = 'profiles'
   and column_name in ('withdraw_locked', 'lock_reason', 'locked_at', 'locked_by')
union all
select 'table account_appeals'
 where to_regclass('public.account_appeals') is not null;
