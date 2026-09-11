-- 016: a withdrawal takes the money when the player sends the charge TrxID.
--
-- The operator's rule (2026-09-12): "trxid submit korar por profile thaika
-- taka kaita niya jabe; kew trxid na diya submit kore tahole balance katbe
-- na". Built on 014, which stopped request_withdrawal taking the money and
-- made approve_withdrawal take it instead (`withdrawals.debited`):
--
--   • pay_withdrawal_charge — the charge screen's TrxID — now takes the
--     amount from the wallet and marks the row debited. Short of money by
--     then (it was played away) → refused, nothing written.
--   • a request whose TrxID never comes keeps the balance whole; approving
--     it anyway still takes the money there (014), and rejecting it gives
--     nothing back because nothing was taken (014).
--   • a charge TrxID already used on another withdrawal is refused, as a
--     deposit TrxID is (015).
--
-- The charge amount itself is still worked out by /api/withdraw/charge from
-- the cashier config and frozen once quoted (007). This replaces that
-- route's direct table write, so quote, proof and debit land together.
--
-- Needs 014. Safe to run more than once.

create or replace function pay_withdrawal_charge(
  p_id      bigint,
  p_user    uuid,
  p_charge  bigint,
  p_channel text default null,
  p_trx     text default null
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  w    withdrawals%rowtype;
  trx  text := nullif(upper(regexp_replace(coalesce(p_trx, ''), '[^A-Za-z0-9]', '', 'g')), '');
begin
  select * into w from withdrawals where id = p_id and user_id = p_user for update;
  if not found then
    raise exception 'withdrawal % not found', p_id using errcode = 'no_data_found';
  end if;
  if w.state <> 'pending' then
    raise exception 'withdrawal % already %', p_id, w.state using errcode = 'invalid_parameter_value';
  end if;

  if trx is not null then
    if length(trx) < 6 or length(trx) > 20 or trx ~ '^(.)\1+$' then
      raise exception 'txn format' using errcode = 'check_violation';
    end if;
    if exists (
      select 1 from withdrawals
       where id <> p_id and charge_trx_id is not null
         and upper(regexp_replace(charge_trx_id, '[^A-Za-z0-9]', '', 'g')) = trx
    ) then
      raise exception 'txn used' using errcode = 'unique_violation';
    end if;
  end if;

  -- the money leaves with the TrxID, once; balance >= 0 aborts a short wallet
  if trx is not null and not w.debited then
    perform wallet_apply(p_user, 'withdraw', -w.amount, 'withdraw:' || p_id);
  end if;

  update withdrawals
     set charge_amount     = case when coalesce(charge_amount, 0) > 0 then charge_amount
                                  else coalesce(p_charge, charge_amount) end,
         charge_channel_id = coalesce(nullif(btrim(p_channel), ''), charge_channel_id),
         charge_trx_id     = coalesce(trx, charge_trx_id),
         charge_paid_at    = case when trx is not null and charge_paid_at is null then now()
                                  else charge_paid_at end,
         debited           = debited or trx is not null
   where id = p_id;

  return trx is not null;
end;
$$;

revoke all on function pay_withdrawal_charge(bigint, uuid, bigint, text, text) from public, anon, authenticated;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function pay_withdrawal_charge(bigint, uuid, bigint, text, text) to service_role;
  end if;
end $$;

notify pgrst, 'reload schema';

-- what you should see: one row, the function
select 'function pay_withdrawal_charge' as added
 where exists (select 1 from pg_proc where proname = 'pay_withdrawal_charge');
