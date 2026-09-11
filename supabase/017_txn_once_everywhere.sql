-- 017 — a TrxID pays once, anywhere on the site
--
-- The operator's rule (2026-09-12): "kew jate fake trxid dite na pare ba
-- akta trxid 2-3 bar use na korte pare". 015 refuses a TrxID already on a
-- deposit, 016 one already on another withdrawal's charge — but neither
-- looked at the other table, so one real bKash payment could be claimed
-- twice: once as a deposit and once as a withdrawal charge. Now:
--
--   • txn_taken() looks in both tables, and both guards use it
--   • both take the same advisory lock per TrxID, so a deposit and a charge
--     sent at the same instant with the same ID cannot both pass
--   • a bKash charge TrxID must be 10 characters, as a bKash deposit's is
--   • a withdrawal's charge TrxID, once given, cannot be swapped for
--     another (sending the same one again is fine) — swapping freed the old
--     ID for reuse and let a fake be "corrected" after the money moved
--
-- Every other line of deposits_guard (015) and pay_withdrawal_charge (016)
-- is unchanged. Still true: a well-made fake TrxID that nobody has used
-- cannot be told from a real one here — only the bKash/Nagad statement
-- knows. The admin checks it before Approve.
--
-- Needs 015 and 016. Safe to run more than once.

create index if not exists withdrawals_charge_txn_norm
  on withdrawals ((upper(regexp_replace(charge_trx_id, '[^A-Za-z0-9]', '', 'g'))))
  where charge_trx_id is not null;

-- ============================================================
-- 1. one question for both tables
-- ============================================================

create or replace function txn_taken(p_norm text, p_skip_withdrawal bigint default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from deposits
     where txn_id is not null
       and upper(regexp_replace(txn_id, '[^A-Za-z0-9]', '', 'g')) = p_norm
  ) or exists (
    select 1 from withdrawals
     where charge_trx_id is not null
       and id is distinct from p_skip_withdrawal
       and upper(regexp_replace(charge_trx_id, '[^A-Za-z0-9]', '', 'g')) = p_norm
  );
$$;

revoke all on function txn_taken(text, bigint) from public, anon, authenticated;

-- ============================================================
-- 2. deposits_guard (015) — now asks txn_taken
-- ============================================================

create or replace function deposits_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  norm    text;
  waiting int;
begin
  if new.txn_id is not null then
    norm := upper(regexp_replace(new.txn_id, '[^A-Za-z0-9]', '', 'g'));
    if norm = '' then
      new.txn_id := null;
    else
      if new.channel_id = 'bkash' and length(norm) <> 10 then
        raise exception 'txn format' using errcode = 'check_violation',
          hint = 'A bKash TrxID has 10 characters';
      end if;
      if length(norm) < 6 or length(norm) > 20 or norm ~ '^(.)\1+$' then
        raise exception 'txn format' using errcode = 'check_violation';
      end if;

      -- the same lock the charge takes: two claims on one ID queue up
      perform pg_advisory_xact_lock(hashtext('txn:' || norm));
      if txn_taken(norm) then
        raise exception 'txn used' using errcode = 'unique_violation';
      end if;

      new.txn_id := norm;
    end if;
  end if;

  select count(*) into waiting from deposits where user_id = new.user_id and state = 'pending';
  if waiting >= 3 then
    raise exception 'too many pending' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists deposits_guard on deposits;
create trigger deposits_guard
  before insert on deposits
  for each row execute function deposits_guard();

-- ============================================================
-- 3. pay_withdrawal_charge (016) — txn_taken, bKash length, no swapping
-- ============================================================

create or replace function pay_withdrawal_charge(
  p_id      bigint,
  p_user    uuid,
  p_charge  bigint,
  p_channel text default null,
  p_trx     text default null
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  w       withdrawals%rowtype;
  trx     text := nullif(upper(regexp_replace(coalesce(p_trx, ''), '[^A-Za-z0-9]', '', 'g')), '');
  channel text;
  had     text;
begin
  select * into w from withdrawals where id = p_id and user_id = p_user for update;
  if not found then
    raise exception 'withdrawal % not found', p_id using errcode = 'no_data_found';
  end if;
  if w.state <> 'pending' then
    raise exception 'withdrawal % already %', p_id, w.state using errcode = 'invalid_parameter_value';
  end if;

  if trx is not null then
    had := nullif(upper(regexp_replace(coalesce(w.charge_trx_id, ''), '[^A-Za-z0-9]', '', 'g')), '');
    if had is not null and had <> trx then
      raise exception 'txn locked' using errcode = 'invalid_parameter_value';
    end if;

    channel := lower(coalesce(nullif(btrim(p_channel), ''), w.charge_channel_id, ''));
    if channel = 'bkash' and length(trx) <> 10 then
      raise exception 'txn format' using errcode = 'check_violation',
        hint = 'A bKash TrxID has 10 characters';
    end if;
    if length(trx) < 6 or length(trx) > 20 or trx ~ '^(.)\1+$' then
      raise exception 'txn format' using errcode = 'check_violation';
    end if;

    perform pg_advisory_xact_lock(hashtext('txn:' || trx));
    if txn_taken(trx, p_id) then
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

-- What you should see: the check, and how many TrxIDs are already on both
-- a deposit and a withdrawal charge (those rows stay; the admin can look).
select 'function txn_taken' as added
 where exists (select 1 from pg_proc where proname = 'txn_taken')
union all
select 'TrxIDs on both a deposit and a charge: ' || count(*)
  from (
    select upper(regexp_replace(d.txn_id, '[^A-Za-z0-9]', '', 'g')) as t
      from deposits d
     where d.txn_id is not null
    intersect
    select upper(regexp_replace(w.charge_trx_id, '[^A-Za-z0-9]', '', 'g'))
      from withdrawals w
     where w.charge_trx_id is not null
  ) both_sides;
