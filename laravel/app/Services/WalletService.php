<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * The only sanctioned way to move money.
 *
 * Every call locks the wallet row, applies the delta and writes the matching
 * ledger entry in one transaction, so `wallets.balance` always equals the sum
 * of that user's `transactions.amount`. All amounts are paisa.
 */
class WalletService
{
    /**
     * Apply a signed delta and return the new balance.
     *
     * @param  'deposit'|'withdraw'|'bet'|'win'|'bonus'|'rebate'|'adjust'  $kind
     *
     * @throws RuntimeException when a debit would take the balance below zero
     */
    public function apply(User|int $user, string $kind, int $amount, ?string $ref = null): int
    {
        $userId = $user instanceof User ? $user->id : $user;

        return DB::transaction(function () use ($userId, $kind, $amount, $ref): int {
            /** @var Wallet $wallet */
            $wallet = Wallet::query()
                ->lockForUpdate()
                ->firstOrCreate(['user_id' => $userId]);

            $balance = $wallet->balance + $amount;

            if ($balance < 0) {
                throw new RuntimeException('ব্যালেন্স যথেষ্ট নয়');
            }

            $wallet->balance = $balance;

            // A wager is what clears a bonus. Without this the turnover a bonus
            // adds could never be worked off, and taking one would lock the
            // account out of withdrawing for good.
            if ($kind === 'bet' && $wallet->turnover_need > 0) {
                $wallet->turnover_done += abs($amount);

                // requirement met: clear it, so a later bonus starts from zero
                // instead of being satisfied by this one's history
                if ($wallet->turnover_done >= $wallet->turnover_need) {
                    $wallet->turnover_need = 0;
                    $wallet->turnover_done = 0;
                }
            }

            $wallet->save();

            Transaction::create([
                'user_id' => $userId,
                'kind' => $kind,
                'amount' => $amount,
                'balance_after' => $balance,
                'ref' => $ref,
            ]);

            return $balance;
        });
    }

    /** Credit a bonus and raise the turnover the player must clear to withdraw it. */
    public function grantBonus(User|int $user, int $amount, int $turnoverMultiplier, ?string $ref = null): int
    {
        $userId = $user instanceof User ? $user->id : $user;

        return DB::transaction(function () use ($userId, $amount, $turnoverMultiplier, $ref): int {
            $balance = $this->apply($userId, 'bonus', $amount, $ref);

            Wallet::query()
                ->where('user_id', $userId)
                ->increment('turnover_need', $amount * $turnoverMultiplier);

            return $balance;
        });
    }

    public function balanceOf(User|int $user): int
    {
        $userId = $user instanceof User ? $user->id : $user;

        return (int) (Wallet::query()->where('user_id', $userId)->value('balance') ?? 0);
    }
}
