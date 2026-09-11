-- 012: player IDs, hold and ban — and the holes they would have leaked through.
--
-- What the admin asked for: every player gets a short number (their ID) that
-- support and the admin can search by, and an admin can put an account ON
-- HOLD (signed in, balance visible, nothing moves) or BAN it (shut).
--
-- A ban is only as good as the column it is written to, and until now a
-- player could rewrite their own profile row wholesale — `is_blocked`,
-- `role`, `vip_level`, `agent_code`, all of it — straight from the browser.
-- Setting `role = 'admin'` also made `is_admin()` true, which opened every
-- player's wallet, ledger and cashier request. So this migration closes that
-- first, then adds the switches, then makes the money functions obey them.
--
-- Also here, because each is a way to move money around the checks:
--   • a player could insert a withdrawals row directly — no debit — and an
--     admin approving it would pay out real money (rejecting it "refunded"
--     money that had never left)
--   • a deposit row took every column the browser sent, state included
--   • request_withdrawal took no password, so a signed-in session could
--     empty the wallet without knowing one
--
-- And two rules the operator set on 2026-09-11:
--   • bonus money cannot be withdrawn until its turnover has been bet —
--     every bonus adds (amount × the multiplier set at /admin/bonus) to
--     wallets.turnover_need, every stake counts toward turnover_done, and a
--     withdrawal is refused while need > done
--   • withdrawals go through the server (/api/withdraw/request), which holds
--     the per-method min/max and the daily count from /admin/cashier; the
--     database function can no longer be called from a browser at all
--
-- Safe to run more than once. The last statement lists any profile whose
-- role is not 'player' — nobody should be there; if somebody is, they
-- promoted themselves through the old hole.

-- ============================================================
-- 1. Players may edit their contact details and nothing else
-- ============================================================

revoke update on profiles from anon, authenticated;
grant update (display_name, real_name, facebook_id, google_id, whatsapp, email, contact_phone)
  on profiles to authenticated;

drop policy if exists "edit own profile" on profiles;
create policy "edit own profile" on profiles
  for update using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- ============================================================
-- 2. The player ID, and the hold/ban switches
-- ============================================================

create sequence if not exists player_no_seq start with 100001;
alter table profiles add column if not exists player_no bigint;

-- existing players are numbered in the order they signed up
do $$
declare r record;
begin
  for r in select id from profiles where player_no is null order by created_at, id loop
    update profiles set player_no = nextval('player_no_seq') where id = r.id;
  end loop;
end $$;

alter table profiles alter column player_no set default nextval('player_no_seq');
alter sequence player_no_seq owned by profiles.player_no;
alter table profiles alter column player_no set not null;
create unique index if not exists profiles_player_no_key on profiles (player_no);

alter table profiles add column if not exists is_held           boolean not null default false;
alter table profiles add column if not exists hold_reason       text;
alter table profiles add column if not exists block_reason      text;
alter table profiles add column if not exists status_changed_at timestamptz;
alter table profiles add column if not exists status_changed_by text;

-- 'banned', 'held' or null. SECURITY DEFINER so a policy can ask it without
-- tripping over the caller's own row-level security.
create or replace function account_block(p_uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select case when is_blocked then 'banned' when is_held then 'held' end
    from profiles where id = p_uid;
$$;

revoke all on function account_block(uuid) from public, anon;
grant execute on function account_block(uuid) to authenticated;

-- ============================================================
-- 3. The money primitive refuses play money on a stopped account
-- ============================================================
-- Stopped means: no new stake, no bonus or rebate, no withdrawal. What is
-- still allowed is what settles an account rather than using it — a deposit
-- an admin approves, an admin adjustment, a win on a bet that was already
-- riding, a refund of a cancelled stake or a rejected withdrawal.

create or replace function wallet_apply(
  p_user uuid, p_kind txn_kind, p_amount bigint, p_ref text default null
) returns bigint language plpgsql security definer set search_path = public as $$
declare
  new_balance bigint;
  blk text;
begin
  if (p_kind = 'bet' and p_amount < 0)
     or p_kind in ('bonus', 'rebate')
     or (p_kind = 'withdraw' and p_amount < 0) then
    blk := account_block(p_user);
    if blk is not null then
      raise exception 'account %', blk using errcode = 'insufficient_privilege';
    end if;
  end if;

  -- every stake counts toward bonus turnover; a refunded stake takes it back
  update wallets
     set balance = balance + p_amount,
         turnover_done = case when p_kind = 'bet' then greatest(0, turnover_done - p_amount)
                              else turnover_done end,
         updated_at = now()
   where user_id = p_user
  returning balance into new_balance;

  if new_balance is null then
    raise exception 'no wallet for %', p_user;
  end if;

  insert into transactions (user_id, kind, amount, balance_after, ref)
  values (p_user, p_kind, p_amount, new_balance, p_ref);

  return new_balance;
end;
$$;

revoke all on function wallet_apply(uuid, txn_kind, bigint, text) from public, anon, authenticated;

-- ============================================================
-- 4. Withdrawals: only through request_withdrawal, and with a password
-- ============================================================

drop policy if exists "raise withdrawal" on withdrawals;
revoke insert, update, delete on withdrawals from anon, authenticated;

-- Only the server calls this now (/api/withdraw/request, with the service
-- role), after checking the method's min/max and the daily count from the
-- cashier config — limits a browser skipped when it called the function
-- itself. The server names the player from their session.
--
-- The password is still checked here, not only on the screen: it is the
-- transaction password when the player has set one (migration 010), the
-- login password otherwise. And any bonus turnover must be finished.
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

-- the browser-callable versions go: the old one asked for no password, and
-- neither could see the cashier limits
drop function if exists request_withdrawal(text, bigint, text);
drop function if exists request_withdrawal(text, bigint, text, text);

revoke all on function request_withdrawal(uuid, text, bigint, text, text) from public, anon, authenticated;

-- ---------- a bonus, and the turnover it brings ----------
-- The server passes the turnover (bonus × the multiplier set at
-- /admin/bonus). Stakes placed before the bonus do not count toward it:
-- when the last requirement was already met, the count starts again.
create or replace function credit_bonus(
  p_user uuid, p_kind txn_kind, p_amount bigint, p_ref text, p_turnover bigint
) returns bigint language plpgsql security definer set search_path = public as $$
declare new_balance bigint;
begin
  new_balance := wallet_apply(p_user, p_kind, p_amount, p_ref);
  if coalesce(p_turnover, 0) > 0 then
    update wallets
       set turnover_done = case when turnover_done >= turnover_need then 0 else turnover_done end,
           turnover_need = case when turnover_done >= turnover_need then p_turnover
                                else turnover_need + p_turnover end
     where user_id = p_user;
  end if;
  return new_balance;
end;
$$;

revoke all on function credit_bonus(uuid, txn_kind, bigint, text, bigint) from public, anon, authenticated;

-- ============================================================
-- 5. Deposits: a player raises a pending request and says nothing else
-- ============================================================
-- state, reviewed_at, admin_note and bonus_amount are ours. The method bonus
-- is worked out by the server when an admin approves, from the cashier
-- config — it used to be a figure the browser wrote, and nothing ever paid it.

revoke insert, update, delete on deposits from anon, authenticated;
grant insert (user_id, channel_id, amount, sender_no, txn_id, method_id) on deposits to authenticated;

drop policy if exists "raise deposit" on deposits;
create policy "raise deposit" on deposits
  for insert with check (user_id = auth.uid() and account_block(auth.uid()) is distinct from 'banned');

-- the bonus credited on approval, once per deposit however often Approve is hit
create unique index if not exists transactions_deposit_bonus_once
  on transactions (user_id, ref)
  where ref like 'deposit-bonus:%';

-- ============================================================
-- 6. Referral codes match whatever case they were typed in
-- ============================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta_phone text := nullif(new.raw_user_meta_data ->> 'phone', '');
  meta_ref   text := nullif(lower(trim(new.raw_user_meta_data ->> 'referral_code')), '');
  meta_agent text := nullif(upper(trim(new.raw_user_meta_data ->> 'agent_code')), '');
  inviter    uuid;
begin
  if meta_ref is not null then
    select id into inviter from profiles where referral_code = meta_ref;
  end if;

  insert into profiles (id, phone, referred_by, agent_code)
  values (
    new.id,
    coalesce(meta_phone, new.phone, split_part(coalesce(new.email, ''), '@', 1)),
    inviter,
    meta_agent
  );

  insert into wallets (user_id) values (new.id);
  return new;
end;
$$;

-- ============================================================
-- 7. Grants the service role needs back after the revokes above
-- ============================================================

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function wallet_apply(uuid, txn_kind, bigint, text)          to service_role;
    grant execute on function request_withdrawal(uuid, text, bigint, text, text) to service_role;
    grant execute on function credit_bonus(uuid, txn_kind, bigint, text, bigint) to service_role;
    grant execute on function account_block(uuid)                                to service_role;
  end if;
end $$;

-- ============================================================
-- Anyone who used the old hole to promote themselves shows up here.
-- An empty result is the answer you want.
-- ============================================================
select player_no, phone, role, is_blocked, created_at
  from profiles
 where role <> 'player'
 order by created_at;
