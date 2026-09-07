-- 007: the withdrawal charge stops being something the browser can name.
--
-- 006 let the owner of a pending withdrawal fill in its charge. It checked
-- the row was theirs and still pending, but it wrote whatever amount it was
-- handed — so a player could call it straight from the browser with a charge
-- of zero and leave an admin approving a withdrawal that looked like it owed
-- nothing. The rate lives in the cashier config, which is ours, so the figure
-- is worked out in /api/withdraw/charge and written with the service role.
--
-- Two changes here:
--   * `authenticated` loses execute on set_withdrawal_charge, so the browser
--     cannot reach it at all;
--   * a quote, once written, is frozen. Even called as the owner the amount
--     can only go from unset to set. The proof — channel, account, TrxID —
--     stays open, which is all the player ever needed to send.
--
-- Safe to run more than once.

create or replace function set_withdrawal_charge(
  p_id         bigint,
  p_charge     bigint default null,
  p_channel    text   default null,
  p_account_no text   default null,
  p_trx        text   default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  w withdrawals%rowtype;
begin
  select * into w from withdrawals where id = p_id for update;
  if not found then
    raise exception 'withdrawal % not found', p_id using errcode = 'no_data_found';
  end if;
  -- once an admin has ruled on it the proof is frozen
  if w.state <> 'pending' then
    raise exception 'withdrawal % already %', p_id, w.state using errcode = 'invalid_parameter_value';
  end if;

  update withdrawals
     set charge_amount     = case
                               -- a quote is a quote: settable once, never moved
                               when coalesce(charge_amount, 0) > 0 then charge_amount
                               else coalesce(p_charge, charge_amount)
                             end,
         charge_channel_id = coalesce(nullif(btrim(p_channel), ''), charge_channel_id),
         charge_account_no = coalesce(nullif(btrim(p_account_no), ''), charge_account_no),
         charge_trx_id     = coalesce(nullif(btrim(p_trx), ''), charge_trx_id),
         charge_paid_at    = case
                               when nullif(btrim(p_trx), '') is not null and charge_paid_at is null
                               then now() else charge_paid_at
                             end
   where id = p_id;
end;
$$;

-- the browser goes through /api/withdraw/charge now, which runs as the owner
revoke all on function set_withdrawal_charge(bigint, bigint, text, text, text)
  from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function set_withdrawal_charge(bigint, bigint, text, text, text) to service_role;
  end if;
end $$;
