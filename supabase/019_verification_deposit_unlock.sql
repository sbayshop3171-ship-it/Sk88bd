-- 019: verification deposit target for account locks.
-- Run after 013. Amounts use the same paisa unit as deposits.amount.

alter table profiles
  add column if not exists verification_deposit_amount bigint not null default 0;

create index if not exists profiles_verification_locked
  on profiles (withdraw_locked, verification_deposit_amount)
  where withdraw_locked;

notify pgrst, 'reload schema';