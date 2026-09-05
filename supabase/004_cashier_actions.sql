-- ============================================================
-- 004 — cashier actions
--
-- Approving a deposit is two writes: mark the request, move the money. Doing
-- them from the app would leave a window where one lands and the other does
-- not, and a double-clicked Approve would credit twice. These functions do
-- both inside one statement and refuse to act on a request that is no longer
-- pending, so a repeat call is a no-op rather than a second payout.
--
-- Withdrawals hold the money at request time: the balance leaves the wallet
-- when the player asks, and comes back only if the request is rejected or
-- cancelled. Otherwise a player could ask to withdraw and then gamble the
-- same balance away while the request sits in the queue.
--
-- Idempotent: safe to re-run.
-- ============================================================

-- ---------- deposits ----------

create or replace function approve_deposit(p_id bigint, p_note text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  d deposits%rowtype;
  new_balance bigint;
begin
  select * into d from deposits where id = p_id for update;

  if not found then
    raise exception 'deposit % not found', p_id using errcode = 'no_data_found';
  end if;
  if d.state <> 'pending' then
    raise exception 'deposit % already %', p_id, d.state using errcode = 'invalid_parameter_value';
  end if;

  update deposits
     set state = 'approved', admin_note = p_note, reviewed_at = now()
   where id = p_id;

  new_balance := wallet_apply(d.user_id, 'deposit', d.amount, 'deposit:' || p_id);
  return new_balance;
end;
$$;

create or replace function reject_deposit(p_id bigint, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare d deposits%rowtype;
begin
  select * into d from deposits where id = p_id for update;

  if not found then
    raise exception 'deposit % not found', p_id using errcode = 'no_data_found';
  end if;
  if d.state <> 'pending' then
    raise exception 'deposit % already %', p_id, d.state using errcode = 'invalid_parameter_value';
  end if;

  -- nothing was credited, so there is nothing to give back
  update deposits
     set state = 'rejected', admin_note = p_note, reviewed_at = now()
   where id = p_id;
end;
$$;

-- ---------- withdrawals ----------

-- Called by the player. Debits first, so the check constraint on
-- wallets.balance rejects a request the balance cannot cover.
create or replace function request_withdrawal(
  p_channel text, p_amount bigint, p_account_no text
) returns bigint language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  new_id bigint;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive' using errcode = 'invalid_parameter_value';
  end if;
  if coalesce(btrim(p_account_no), '') = '' then
    raise exception 'account number required' using errcode = 'invalid_parameter_value';
  end if;

  -- balance >= 0 is a check constraint, so an over-draw aborts here
  perform wallet_apply(uid, 'withdraw', -p_amount, 'withdraw:pending');

  insert into withdrawals (user_id, channel_id, amount, account_no)
  values (uid, p_channel, p_amount, btrim(p_account_no))
  returning id into new_id;

  return new_id;
end;
$$;

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

  -- the money already left the wallet when the request was raised
  update withdrawals
     set state = 'approved', admin_note = p_note, reviewed_at = now()
   where id = p_id;
end;
$$;

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

  -- give the held balance back
  new_balance := wallet_apply(w.user_id, 'withdraw', w.amount, 'withdraw:refund:' || p_id);
  return new_balance;
end;
$$;

-- ---------- admin balance adjustment ----------

create or replace function adjust_balance(p_user uuid, p_amount bigint, p_note text)
returns bigint language plpgsql security definer set search_path = public as $$
begin
  if p_amount = 0 then
    raise exception 'amount must not be zero' using errcode = 'invalid_parameter_value';
  end if;
  return wallet_apply(p_user, 'adjust', p_amount, coalesce(p_note, 'admin adjust'));
end;
$$;

-- ---------- who may call what ----------
-- The admin panel signs in against its own store, not Supabase Auth, so it
-- reaches these through the service-role key, which bypasses RLS and these
-- grants alike. Players only ever need request_withdrawal.
revoke all on function approve_deposit(bigint, text)      from public, anon, authenticated;
revoke all on function reject_deposit(bigint, text)       from public, anon, authenticated;
revoke all on function approve_withdrawal(bigint, text)   from public, anon, authenticated;
revoke all on function reject_withdrawal(bigint, text)    from public, anon, authenticated;
revoke all on function adjust_balance(uuid, bigint, text) from public, anon, authenticated;

revoke all on function request_withdrawal(text, bigint, text) from public, anon;
grant execute on function request_withdrawal(text, bigint, text) to authenticated;

-- wallet_apply is the money primitive: nobody calls it directly but the
-- functions above, which are SECURITY DEFINER and run as the owner.
revoke all on function wallet_apply(uuid, txn_kind, bigint, text) from public, anon, authenticated;

-- The revokes above strip the implicit PUBLIC grant, which service_role
-- inherits too. Hand it back explicitly, or the admin panel's service-role
-- calls come back as "permission denied for function".
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function approve_deposit(bigint, text)          to service_role;
    grant execute on function reject_deposit(bigint, text)           to service_role;
    grant execute on function approve_withdrawal(bigint, text)       to service_role;
    grant execute on function reject_withdrawal(bigint, text)        to service_role;
    grant execute on function adjust_balance(uuid, bigint, text)     to service_role;
    grant execute on function request_withdrawal(text, bigint, text) to service_role;
    grant execute on function wallet_apply(uuid, txn_kind, bigint, text) to service_role;
  end if;
end $$;
