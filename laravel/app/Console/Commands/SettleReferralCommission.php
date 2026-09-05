<?php

namespace App\Console\Commands;

use App\Models\Setting;
use App\Models\Transaction;
use App\Services\WalletService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Pay referrers their share of what their referrals lost.
 *
 * The refer screen has always promised a lifetime commission and counted it
 * out of `rebate` ledger entries — entries nothing ever wrote. This is what
 * writes them.
 *
 * A day's commission is a slice of the GGR the referred players generated that
 * day: everything they staked, less everything they won. A day they came out
 * ahead pays the referrer nothing rather than billing them for it, so a lucky
 * referral cannot put a referrer's balance underwater.
 *
 * The rate ships at zero. Nothing is paid until an operator sets one in the
 * admin panel, which is deliberate — the number is a business decision, not a
 * default worth guessing at.
 */
class SettleReferralCommission extends Command
{
    protected $signature = 'referrals:settle
                            {--date= : the day to settle, YYYY-MM-DD (default: yesterday)}
                            {--dry-run : work out what would be paid without paying it}';

    protected $description = "Credit referrers a share of their referrals' losses for one day";

    public function handle(WalletService $wallet): int
    {
        $rateBp = (int) (Setting::get('referral', ['rate_bp' => 0])['rate_bp'] ?? 0);

        if ($rateBp <= 0) {
            $this->components->warn('রেফারেল কমিশনের হার ০ — কিছু দেওয়া হয়নি। /admin/settings এ হার বসান।');

            return self::SUCCESS;
        }

        $date = $this->option('date')
            ? Carbon::parse($this->option('date'))->startOfDay()
            : now()->subDay()->startOfDay();

        $ref = "referral:{$date->toDateString()}";
        $dryRun = (bool) $this->option('dry-run');

        $rows = Transaction::query()
            ->join('users as u', 'u.id', '=', 'transactions.user_id')
            ->whereIn('transactions.kind', ['bet', 'win'])
            ->whereBetween('transactions.created_at', [$date, $date->copy()->endOfDay()])
            ->whereNotNull('u.referred_by')
            ->groupBy('u.referred_by')
            ->selectRaw('u.referred_by as referrer_id, -sum(transactions.amount) as ggr')
            ->get();

        $paid = 0;
        $total = 0;

        foreach ($rows as $row) {
            $ggr = (int) $row->ggr;

            if ($ggr <= 0) {
                continue;
            }

            $commission = intdiv($ggr * $rateBp, 10_000);

            if ($commission <= 0) {
                continue;
            }

            // Re-running a day must not pay it twice, and a failed run has to
            // be safe to repeat.
            $already = Transaction::where('user_id', $row->referrer_id)->where('ref', $ref)->exists();

            if ($already) {
                continue;
            }

            if (! $dryRun) {
                $wallet->apply((int) $row->referrer_id, 'rebate', $commission, $ref);
            }

            $paid++;
            $total += $commission;
        }

        $this->components->info(sprintf(
            '%s — %d জনকে %s কমিশন%s',
            $date->toDateString(),
            $paid,
            '৳'.number_format($total / 100, 2),
            $dryRun ? ' (ড্রাই রান, কিছু দেওয়া হয়নি)' : '',
        ));

        return self::SUCCESS;
    }
}
