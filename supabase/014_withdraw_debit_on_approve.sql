-- 014 — a withdrawal takes the money when it is approved, not when asked
--
-- The operator's rule (2026-09-12): "withdraw request accept na hole
-- porjonto profile thaiak taka katbe na". Until now request_withdrawal
-- debited the wallet at once and reject_withdrawal paid it back.
--
-- Now:
--   • request_withdrawal checks the balance covers this request plus every
--     other one still waiting, and takes nothing.
--   • approve_withdrawal takes the money. If the player has since spent it
--     (the balance is theirs to play with while they wait), the wallet's
--     balance >= 0 check aborts the approval and the request stays pending
--     for the admin to reject.
--   • reject_withdrawal gives money back only to a request that had taken it.
--
-- `withdrawals.debited` tells the two kinds apart. Every row that exists
-- before this runs was debited when it was raised, so the column defaults
-- to true for them; request_withdrawal writes false from now on.
--
-- Safe to run twice.

alter table withdrawals add column if not exists debited boolean not null default true;

-- ============================================================
-- 1. request_withdrawal: check, don't take
-- ============================================================
-- Identical to 013 but for the balance check at the end.

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
  bal        bigint;
  waiting    bigint;
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

  -- the wallet row is locked so two requests at once cannot both pass
  select balance, turnover_need, turnover_done into bal, t_need, t_done
    from wallets where user_id = uid for update;
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

  -- requests still waiting that have not taken their money yet
  select coalesce(sum(amount), 0) into waiting
    from withdrawals where user_id = uid and state = 'pending' and not debited;
  if coalesce(bal, 0) < waiting + p_amount then
    raise exception 'insufficient balance' using errcode = 'check_violation';
  end if;

  insert into withdrawals (user_id, channel_id, amount, account_no, debited)
  values (uid, p_channel, p_amount, btrim(p_account_no), false)
  returning id into new_id;

  return new_id;
end;
$$;

-- ============================================================
-- 2. approve_withdrawal: the money leaves here
-- ============================================================

create or replace function approve_withdrawal(p_id bigint, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare w withdrawals%rowtype;
begin
  select * into w from withdrawals where id = p_id for update;

  if not found then
    raise exception 'withdrawal % not found', p_id using errcode = 'no_data_found';
  end if;
  if w.state <> 'pending' then
    raise exception 'withdrawal % already %', p_id, w.state using errcode = 'invalid_parameter_value';
  end if;

  -- balance >= 0 is a check constraint: a player who has spent the money
  -- since asking aborts the approval here, and the request stays pending
  if not w.debited then
    perform wallet_apply(w.user_id, 'withdraw', -w.amount, 'withdraw:' || p_id);
  end if;

  update withdrawals
     set state = 'approved', admin_note = p_note, reviewed_at = now(), debited = true
   where id = p_id;
end;
$$;

-- ============================================================
-- 3. reject_withdrawal: refund only what was taken
-- ============================================================

create or replace function reject_withdrawal(p_id bigint, p_note text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  w withdrawals%rowtype;
  new_balance bigint;
begin
  select * into w from withdrawals where id = p_id for update;

  if not found then
    raise exception 'withdrawal % not found', p_id using errcode = 'no_data_found';
  end if;
  if w.state <> 'pending' then
    raise exception 'withdrawal % already %', p_id, w.state using errcode = 'invalid_parameter_value';
  end if;

  update withdrawals
     set state = 'rejected', admin_note = p_note, reviewed_at = now()
   where id = p_id;

  if w.debited then
    new_balance := wallet_apply(w.user_id, 'withdraw', w.amount, 'withdraw:refund:' || p_id);
  else
    select balance into new_balance from wallets where user_id = w.user_id;
  end if;
  return new_balance;
end;
$$;

revoke all on function request_withdrawal(uuid, text, bigint, text, text) from public, anon, authenticated;
revoke all on function approve_withdrawal(bigint, text) from public, anon, authenticated;
revoke all on function reject_withdrawal(bigint, text)  from public, anon, authenticated;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function request_withdrawal(uuid, text, bigint, text, text) to service_role;
    grant execute on function approve_withdrawal(bigint, text) to service_role;
    grant execute on function reject_withdrawal(bigint, text)  to service_role;
  end if;
end $$;

notify pgrst, 'reload schema';

-- what you should see: the column, and the three functions carrying it
select column_name, data_type, column_default
  from information_schema.columns
 where table_name = 'withdrawals' and column_name = 'debited';
