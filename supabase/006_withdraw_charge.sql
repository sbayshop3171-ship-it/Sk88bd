-- 006: the agent cash-out charge a player pays before a withdrawal is released.
--   * a withdrawal remembers what charge was quoted, which agent number it was
--     to be sent to, and the TrxID the player gives back as proof;
--   * set_withdrawal_charge lets the owner fill those in on their own pending
--     request — the amount itself is never touched here, so the money path in
--     004 stays exactly as it was.
-- Safe to run more than once.

alter table withdrawals add column if not exists charge_amount     bigint not null default 0;
alter table withdrawals add column if not exists charge_channel_id text;
alter table withdrawals add column if not exists charge_account_no text;
alter table withdrawals add column if not exists charge_trx_id     text;
alter table withdrawals add column if not exists charge_paid_at    timestamptz;

create or replace function set_withdrawal_charge(
  p_id         bigint,
  p_charge     bigint default null,
  p_channel    text   default null,
  p_account_no text   default null,
  p_trx        text   default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  w   withdrawals%rowtype;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;

  select * into w from withdrawals where id = p_id for update;
  if not found or w.user_id <> uid then
    raise exception 'withdrawal % not found', p_id using errcode = 'no_data_found';
  end if;
  -- once an admin has ruled on it the proof is frozen
  if w.state <> 'pending' then
    raise exception 'withdrawal % already %', p_id, w.state using errcode = 'invalid_parameter_value';
  end if;

  update withdrawals
     set charge_amount     = coalesce(p_charge, charge_amount),
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

revoke all on function set_withdrawal_charge(bigint, bigint, text, text, text) from public, anon;
grant execute on function set_withdrawal_charge(bigint, bigint, text, text, text) to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function set_withdrawal_charge(bigint, bigint, text, text, text) to service_role;
  end if;
end $$;
