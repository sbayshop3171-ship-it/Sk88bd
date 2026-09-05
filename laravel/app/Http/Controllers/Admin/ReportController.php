<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Deposit;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Withdrawal;
use App\Support\GameRounds;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Day-by-day figures.
 *
 * The dashboard answers "how is today going". This answers the question that
 * actually decides anything: whether the site made money last week, and where
 * it went. GGR is stakes minus wins — what the games kept, before the cashier
 * gave any of it back.
 */
class ReportController extends Controller
{
    private const MAX_DAYS = 90;

    public function index(Request $request): Response
    {
        $days = min(self::MAX_DAYS, max(7, $request->integer('days', 30)));
        $from = now()->startOfDay()->subDays($days - 1);

        $rows = [];

        for ($day = $from->copy(); $day <= now()->startOfDay(); $day->addDay()) {
            $rows[] = $this->day($day->copy());
        }

        $rows = array_reverse($rows);

        return Inertia::render('Admin/Reports', [
            'rows' => $rows,
            'days' => $days,
            'totals' => [
                'deposits' => array_sum(array_column($rows, 'deposits')),
                'withdrawals' => array_sum(array_column($rows, 'withdrawals')),
                'staked' => array_sum(array_column($rows, 'staked')),
                'paid' => array_sum(array_column($rows, 'paid')),
                'ggr' => array_sum(array_column($rows, 'ggr')),
                'signups' => array_sum(array_column($rows, 'signups')),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function day(Carbon $day): array
    {
        $end = $day->copy()->endOfDay();

        $staked = (int) -Transaction::where('kind', 'bet')->whereBetween('created_at', [$day, $end])->sum('amount');
        $paid = (int) Transaction::where('kind', 'win')->whereBetween('created_at', [$day, $end])->sum('amount');

        return [
            'date' => $day->toDateString(),
            'deposits' => (int) Deposit::where('state', 'approved')->whereBetween('reviewed_at', [$day, $end])->sum('amount'),
            'withdrawals' => (int) Withdrawal::where('state', 'approved')->whereBetween('reviewed_at', [$day, $end])->sum('amount'),
            'bonuses' => (int) Transaction::whereIn('kind', ['bonus', 'rebate'])->whereBetween('created_at', [$day, $end])->sum('amount'),
            'staked' => $staked,
            'paid' => $paid,
            'ggr' => $staked - $paid,
            'rounds' => (int) GameRounds::query()->whereBetween('rounds.created_at', [$day, $end])->count(),
            'signups' => User::where('role', 'player')->whereBetween('created_at', [$day, $end])->count(),
        ];
    }
}
