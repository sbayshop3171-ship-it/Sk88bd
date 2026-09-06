-- 005: the redesigned cashier.
--   * deposits remember which admin-defined method the player picked and the
--     bonus that method promised, so the admin queue can credit it;
--   * players keep a short list of payout wallets per withdraw method.
-- Safe to run more than once.

alter table deposits add column if not exists method_id text;
alter table deposits add column if not exists bonus_amount bigint not null default 0;

create table if not exists payout_accounts (
  id          bigserial primary key,
  user_id     uuid not null references profiles(id) on delete cascade,
  channel_id  text not null references payment_channels(id),
  account_no  text not null,
  holder      text not null default '',
  created_at  timestamptz not null default now(),
  unique (user_id, channel_id, account_no)
);

alter table payout_accounts enable row level security;

drop policy if exists "own payout accounts" on payout_accounts;
create policy "own payout accounts" on payout_accounts
  for select using (user_id = auth.uid() or is_admin());
drop policy if exists "add payout account" on payout_accounts;
create policy "add payout account" on payout_accounts
  for insert with check (user_id = auth.uid());
drop policy if exists "drop payout account" on payout_accounts;
create policy "drop payout account" on payout_accounts
  for delete using (user_id = auth.uid());

grant select, insert, delete on payout_accounts to authenticated;
grant usage, select on sequence payout_accounts_id_seq to authenticated;
