-- ============================================================
-- 008 — an agent's own players
--
-- Players could already invite players (profiles.referral_code /
-- referred_by, migration 002). Agents could not: they are staff logins in
-- .data/admin-users-store.json, not rows in profiles, so nothing tied a
-- signup to the agent who brought it in. The panel could show "how many
-- users" but never "whose".
--
-- An agent carries a short code instead of a profile id — the staff store
-- is a file on the app server and its ids mean nothing to Postgres, so the
-- code is the only thing both sides can agree on. It is written once at
-- signup and never rewritten: moving a player between agents is a decision
-- somebody makes on purpose, not something a second visit to a link does.
-- ============================================================

alter table profiles add column if not exists agent_code text;

-- every agent screen asks "who is under this code", so the count is an
-- index lookup rather than a scan of every player
create index if not exists profiles_agent_code_idx
  on profiles (agent_code)
  where agent_code is not null;

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta_phone text := nullif(new.raw_user_meta_data ->> 'phone', '');
  meta_ref   text := nullif(new.raw_user_meta_data ->> 'referral_code', '');
  meta_agent text := nullif(upper(trim(new.raw_user_meta_data ->> 'agent_code')), '');
  inviter    uuid;
begin
  if meta_ref is not null then
    select id into inviter from profiles where referral_code = meta_ref;
  end if;

  -- the code is stored as sent, whether or not a live agent answers to it:
  -- an agent disabled after sharing their link still has to explain who
  -- these players are, and a blank column would erase that
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
