<?php

namespace App\Http\Controllers;

use App\Models\DailyCheckin;
use App\Models\Promotion;
use App\Models\Setting;
use App\Services\WalletService;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/** Marketing and information screens driven by editable records. */
class PageController extends Controller
{
    /** VIP tiers. Turnover thresholds are in paisa. */
    private const VIP_TIERS = [
        ['level' => 'VIP 1', 'need' => 5000000, 'rebate' => '0.3%', 'gift' => '৳৫০'],
        ['level' => 'VIP 2', 'need' => 25000000, 'rebate' => '0.5%', 'gift' => '৳৩০০'],
        ['level' => 'VIP 3', 'need' => 100000000, 'rebate' => '0.7%', 'gift' => '৳১,৫০০'],
        ['level' => 'VIP 4', 'need' => 500000000, 'rebate' => '0.9%', 'gift' => '৳৮,০০০'],
        ['level' => 'VIP 5', 'need' => 2000000000, 'rebate' => '1.2%', 'gift' => '৳৪০,০০০'],
    ];

    public function promotions(): Response
    {
        return Inertia::render('Promotions', [
            'promotions' => Promotion::active()->orderBy('sort_order')->get(),
        ]);
    }

    public function reward(Request $request): Response
    {
        $bonus = Setting::get('checkin_bonus', ['amount' => 0, 'turnover_multiplier' => 10]);
        $user = $request->user();

        return Inertia::render('Reward', [
            'tiers' => self::VIP_TIERS,
            'checkin' => [
                'amount' => (int) ($bonus['amount'] ?? 0),
                'turnoverMultiplier' => (int) ($bonus['turnover_multiplier'] ?? 10),
                'claimedToday' => $user !== null && DailyCheckin::where('user_id', $user->id)
                    ->whereDate('checked_on', today())
                    ->exists(),
            ],
        ]);
    }

    /**
     * Claim today's check-in bonus.
     *
     * The unique key on (user_id, checked_on) is what makes this safe to tap
     * twice: the second insert fails rather than paying out again.
     */
    public function checkIn(Request $request, WalletService $wallet): RedirectResponse
    {
        $bonus = Setting::get('checkin_bonus', ['amount' => 0, 'turnover_multiplier' => 10]);
        $amount = (int) ($bonus['amount'] ?? 0);

        if ($amount <= 0) {
            return back()->with('toast', 'ডেইলি চেক-ইন বোনাস এখন বন্ধ আছে');
        }

        $user = $request->user();

        try {
            DB::transaction(function () use ($user, $amount, $bonus, $wallet): void {
                DailyCheckin::create([
                    'user_id' => $user->id,
                    'checked_on' => today(),
                    'amount' => $amount,
                ]);

                $wallet->grantBonus(
                    $user,
                    $amount,
                    (int) ($bonus['turnover_multiplier'] ?? 10),
                    'ডেইলি চেক-ইন '.today()->toDateString(),
                );
            });
        } catch (QueryException) {
            return back()->with('toast', 'আজকের চেক-ইন বোনাস আগেই নেওয়া হয়েছে');
        }

        return back()->with('toast', 'চেক-ইন বোনাস যোগ হয়েছে');
    }

    public function vip(): Response
    {
        return Inertia::render('Vip', [
            'tiers' => self::VIP_TIERS,
        ]);
    }

    public function support(): Response
    {
        return Inertia::render('Support', [
            'contact' => Setting::get('support', []),
        ]);
    }

    public function download(): Response
    {
        return Inertia::render('Download', [
            'links' => Setting::get('app_links', ['android' => null, 'ios' => null]),
        ]);
    }
}
