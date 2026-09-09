-- One claim per player per period.
--
-- The claim engine (lib/bonus-claim.ts) writes every bonus and rebate into
-- the ledger under a ref that names the period: signin:2026-09-09,
-- rebate:2026-09-08, promo:WELCOME50, spin:first. It checks that ref before writing,
-- which catches the ordinary double-tap — but two requests that arrive
-- together both read "not claimed" and both write. This index is the part
-- that cannot be raced.
--
-- Partial on purpose: bets, wins, deposits and withdrawals reuse refs freely
-- and must keep doing so. Only the five claim kinds are unique.

create unique index if not exists transactions_claim_once
  on transactions (user_id, ref)
  where ref is not null
    and (ref like 'signin:%' or ref like 'rescue:%'
      or ref like 'rebate:%' or ref like 'promo:%'
      or ref like 'spin:%' or ref like 'mission:%');
