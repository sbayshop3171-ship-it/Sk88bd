-- 015: a TrxID pays once — fake and reused deposit requests stop at the door.
--
-- The operator's rule (2026-09-12): "fake deposit jno kew korte na pare …
-- same transaction bar bar use na korte pare". A deposit request is a row
-- the player writes straight from the browser (012 limits which columns),
-- so the check has to live here, not on the screen:
--
--   • the TrxID is stored in one shape — letters and digits, upper case —
--     so "abc 123" and "ABC123" are the same ID
--   • a TrxID already on ANY deposit, pending, approved or rejected, is
--     refused: a rejected fake cannot be tried again either
--   • a bKash TrxID is 10 characters; any other is 6–20, and never one
--     character repeated ("1111111111")
--   • one player can have at most 3 requests waiting at a time, so a run
--     of made-up IDs cannot flood the queue
--
-- What this cannot do is tell a real TrxID from a well-made fake: only the
-- operator's own bKash/Nagad statement knows which money arrived. That is
-- still the admin's check before Approve.
--
-- A trigger rather than a unique index because rows written before this
-- may already share a TrxID, and a unique index would refuse to build.
-- Safe to run more than once. Needs 012.

create index if not exists deposits_txn_norm
  on deposits ((upper(regexp_replace(txn_id, '[^A-Za-z0-9]', '', 'g'))))
  where txn_id is not null;

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

      -- two requests with the same ID at the same instant: the second waits
      -- for the first, then sees it
      perform pg_advisory_xact_lock(hashtext('deposit-txn:' || norm));
      if exists (
        select 1 from deposits
         where txn_id is not null
           and upper(regexp_replace(txn_id, '[^A-Za-z0-9]', '', 'g')) = norm
      ) then
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

-- What you should see: the trigger, and how many TrxIDs were already used
-- more than once before it existed (those rows stay; the admin can look).
select 'trigger deposits_guard' as added
 where exists (select 1 from pg_trigger where tgname = 'deposits_guard')
union all
select 'TrxIDs already on more than one deposit: ' || count(*)
  from (
    select upper(regexp_replace(txn_id, '[^A-Za-z0-9]', '', 'g')) as t
      from deposits where txn_id is not null
     group by 1 having count(*) > 1
  ) d;
