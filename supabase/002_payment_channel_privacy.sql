-- ============================================================
-- 002 — keep the operator's receiving accounts off the public API
--
-- payment_channels carries account_no / account_name: the bKash or Nagad
-- number players send money to. The 001 policy allowed anyone holding the
-- publishable key (which ships in the browser bundle, so: everyone) to read
-- every column. Channels stay publicly listable, but the account details are
-- now admin-only on the base table and reachable by a signed-in player only
-- through the function at the bottom.
--
-- Idempotent: safe to re-run.
-- ============================================================

-- 1. base table becomes admin-only for reads
drop policy if exists "read channels" on payment_channels;

drop policy if exists "admin reads channels" on payment_channels;
create policy "admin reads channels" on payment_channels
  for select using (is_admin());

-- 2. everyone may list channels — without the account columns
create or replace view payment_channels_public
with (security_invoker = off) as
  select id, name, kind, min_amount, max_amount, sort_order
  from payment_channels
  where is_active;

grant select on payment_channels_public to anon, authenticated;

-- 3. a signed-in player gets the account details for one channel only,
--    at the moment they are about to deposit
create or replace function deposit_account(p_channel text)
returns table (account_no text, account_name text)
language sql stable security definer set search_path = public as $$
  select c.account_no, c.account_name
  from payment_channels c
  where c.id = p_channel
    and c.is_active
    and auth.uid() is not null;
$$;

revoke all on function deposit_account(text) from public, anon;
grant execute on function deposit_account(text) to authenticated;

-- ============================================================
-- 4. store the real mobile number, not the synthetic login address
--
-- Players sign in with a phone number that is mapped to an internal
-- <phone>@id.<domain> address (Supabase phone auth needs a paid SMS
-- provider, which this project does not have yet). The original trigger
-- fell back to that address for profiles.phone. Read the real number from
-- the signup metadata instead, so the column always holds a usable number
-- even if the client never gets to run its follow-up update.
-- ============================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta_phone text := nullif(new.raw_user_meta_data ->> 'phone', '');
  meta_ref   text := nullif(new.raw_user_meta_data ->> 'referral_code', '');
  inviter    uuid;
begin
  if meta_ref is not null then
    select id into inviter from profiles where referral_code = meta_ref;
  end if;

  insert into profiles (id, phone, referred_by)
  values (
    new.id,
    coalesce(meta_phone, new.phone, split_part(coalesce(new.email, ''), '@', 1)),
    inviter
  );

  insert into wallets (user_id) values (new.id);
  return new;
end;
$$;
