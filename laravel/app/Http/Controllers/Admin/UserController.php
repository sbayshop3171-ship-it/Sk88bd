<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAction;
use App\Models\Transaction;
use App\Models\User;
use App\Services\AuditLog;
use App\Services\WalletService;
use App\Support\GameRounds;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('q')->toString();

        return Inertia::render('Admin/Users', [
            'rows' => User::query()
                ->with('wallet')
                ->when($search !== '', fn ($q) => $q
                    ->where('phone', 'like', "%{$search}%")
                    ->orWhere('referral_code', 'like', "%{$search}%"))
                ->latest()
                ->paginate(30)
                ->withQueryString(),
            'q' => $search,
        ]);
    }

    /**
     * One player, everything about them on one screen.
     *
     * A support call is always about a specific person — "my deposit did not
     * come", "why can I not withdraw". Answering it from the list screen meant
     * three filtered searches across three tabs; this puts the wallet, the
     * turnover holding it, the cashier history and the rounds side by side.
     */
    public function show(User $user): Response
    {
        $user->load(['wallet', 'referrer:id,phone']);

        $totals = Transaction::query()
            ->where('user_id', $user->id)
            ->selectRaw("coalesce(sum(case when kind = 'deposit' then amount end), 0) as deposited")
            ->selectRaw("coalesce(sum(case when kind = 'withdraw' then -amount end), 0) as withdrawn")
            ->selectRaw("coalesce(sum(case when kind = 'bet' then -amount end), 0) as staked")
            ->selectRaw("coalesce(sum(case when kind = 'win' then amount end), 0) as won")
            ->selectRaw("coalesce(sum(case when kind in ('bonus', 'rebate') then amount end), 0) as bonus")
            ->selectRaw("coalesce(sum(case when kind = 'adjust' then amount end), 0) as adjusted")
            ->first();

        $wallet = $user->wallet;

        return Inertia::render('Admin/UserDetail', [
            'player' => [
                'id' => $user->id,
                'phone' => $user->phone,
                'display_name' => $user->display_name,
                'role' => $user->role,
                'vip_level' => $user->vip_level,
                'is_blocked' => $user->is_blocked,
                'referral_code' => $user->referral_code,
                'referred_by' => $user->referrer?->phone,
                'created_at' => $user->created_at?->toDateTimeString(),
                'last_login_at' => $user->last_login_at?->toDateTimeString(),
            ],
            'wallet' => [
                'balance' => (int) ($wallet->balance ?? 0),
                'bonus_balance' => (int) ($wallet->bonus_balance ?? 0),
                'turnover_need' => (int) ($wallet->turnover_need ?? 0),
                'turnover_done' => (int) ($wallet->turnover_done ?? 0),
            ],
            'totals' => [
                'deposited' => (int) $totals->deposited,
                'withdrawn' => (int) $totals->withdrawn,
                'staked' => (int) $totals->staked,
                'won' => (int) $totals->won,
                'bonus' => (int) $totals->bonus,
                'adjusted' => (int) $totals->adjusted,
                // what the site kept off this player's play
                'ggr' => (int) $totals->staked - (int) $totals->won,
            ],
            'deposits' => $user->deposits()->with('channel:id,name')->latest()->limit(10)->get(),
            'withdrawals' => $user->withdrawals()->with('channel:id,name')->latest()->limit(10)->get(),
            'transactions' => $user->transactions()->latest('id')->limit(25)->get(),
            'rounds' => GameRounds::query()
                ->where('rounds.user_id', $user->id)
                ->orderByDesc('rounds.created_at')
                ->limit(25)
                ->get(),
            'referrals' => $user->referrals()
                ->withCount('transactions')
                ->latest('id')
                ->limit(25)
                ->get(['id', 'phone', 'created_at', 'last_login_at']),
            'actions' => AdminAction::query()
                ->where('target_user_id', $user->id)
                ->with('admin:id,phone,display_name')
                ->latest('id')
                ->limit(20)
                ->get(),
            'games' => GameRounds::games(),
        ]);
    }

    public function update(Request $request, User $user, AuditLog $audit): RedirectResponse
    {
        $data = $request->validate([
            'is_blocked' => ['nullable', 'boolean'],
            'vip_level' => ['nullable', 'integer', 'min:0', 'max:10'],
            'display_name' => ['nullable', 'string', 'max:64'],
        ]);

        $changes = array_filter($data, fn ($v): bool => $v !== null);

        $user->forceFill($changes)->save();

        $audit->record(
            action: 'user.update',
            subjectType: 'user',
            subjectId: $user->id,
            targetUser: $user,
            note: json_encode($changes, JSON_UNESCAPED_UNICODE) ?: null,
        );

        return back()->with('toast', 'ইউজার আপডেট হয়েছে');
    }

    /** Manual credit or debit. Always leaves a ledger entry with the reason. */
    public function adjust(Request $request, User $user, WalletService $wallet, AuditLog $audit): RedirectResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'not_in:0'],
            'note' => ['required', 'string', 'max:255'],
        ], [
            'amount.not_in' => 'শূন্য ছাড়া অন্য পরিমাণ দিন',
            'note.required' => 'কারণ লিখুন',
        ]);

        $paisa = (int) round($data['amount'] * 100);

        try {
            $wallet->apply($user, 'adjust', $paisa, $data['note']);
        } catch (RuntimeException $e) {
            return back()->with('toast', "অ্যাডজাস্ট করা যায়নি: {$e->getMessage()}");
        }

        $audit->record(
            action: 'user.adjust',
            subjectType: 'user',
            subjectId: $user->id,
            targetUser: $user,
            amount: $paisa,
            note: $data['note'],
        );

        return back()->with('toast', 'ব্যালেন্স অ্যাডজাস্ট হয়েছে');
    }

    /**
     * Grant a bonus, with the turnover that has to be cleared before it can
     * leave.
     *
     * This is not the same as an adjustment. An adjustment is cash: it lands
     * in the balance and can be withdrawn on the next screen. A bonus is a
     * promise the player has to play through, and granting one without the
     * turnover attached is how a promotion becomes a free cash-out.
     */
    public function bonus(Request $request, User $user, WalletService $wallet, AuditLog $audit): RedirectResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'turnover_multiplier' => ['required', 'integer', 'min:0', 'max:100'],
            'note' => ['required', 'string', 'max:255'],
        ], [
            'amount.min' => 'বোনাস শূন্যের বেশি হতে হবে',
            'note.required' => 'কারণ লিখুন',
        ]);

        $paisa = (int) round($data['amount'] * 100);
        $multiplier = (int) $data['turnover_multiplier'];

        $wallet->grantBonus($user, $paisa, $multiplier, $data['note']);

        $audit->record(
            action: 'user.bonus',
            subjectType: 'user',
            subjectId: $user->id,
            targetUser: $user,
            amount: $paisa,
            note: "{$data['note']} (টার্নওভার {$multiplier}x)",
        );

        return back()->with('toast', 'বোনাস যোগ হয়েছে');
    }
}
