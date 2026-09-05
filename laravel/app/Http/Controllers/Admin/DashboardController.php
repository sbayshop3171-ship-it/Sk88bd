<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Deposit;
use App\Models\PaymentChannel;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Withdrawal;
use App\Support\GameRounds;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $today = now()->startOfDay();

        $betsToday = -Transaction::where('kind', 'bet')->where('created_at', '>=', $today)->sum('amount');
        $winsToday = Transaction::where('kind', 'win')->where('created_at', '>=', $today)->sum('amount');

        // A deposit channel with no receiving number is live on the cashier but
        // gives the player nowhere to send money, so it is surfaced up front
        // rather than left to be discovered by a failed deposit.
        $channelsMissingAccount = PaymentChannel::query()
            ->where('is_active', true)
            ->where('supports_deposit', true)
            ->where(fn ($q) => $q->whereNull('account_no')->orWhere('account_no', ''))
            ->pluck('name');

        return Inertia::render('Admin/Dashboard', [
            'channelsMissingAccount' => $channelsMissingAccount,
            'tiles' => [
                ['label' => 'আজকের ডিপোজিট', 'value' => (int) Deposit::where('state', 'approved')->where('reviewed_at', '>=', $today)->sum('amount'), 'money' => true],
                ['label' => 'আজকের উইথড্র', 'value' => (int) Withdrawal::where('state', 'approved')->where('reviewed_at', '>=', $today)->sum('amount'), 'money' => true],
                ['label' => 'পেন্ডিং ডিপোজিট', 'value' => Deposit::where('state', 'pending')->count()],
                ['label' => 'পেন্ডিং উইথড্র', 'value' => Withdrawal::where('state', 'pending')->count()],
                ['label' => 'মোট ইউজার', 'value' => User::where('role', 'player')->count()],
                ['label' => 'আজ সক্রিয়', 'value' => User::where('last_login_at', '>=', $today)->count()],
                ['label' => 'আজকের GGR', 'value' => (int) ($betsToday - $winsToday), 'money' => true],
                ['label' => 'আজকের রাউন্ড', 'value' => GameRounds::query()->where('rounds.created_at', '>=', $today)->count()],
            ],
        ]);
    }
}
