<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\Setting;
use App\Models\User;
use App\Models\Wallet;
use App\Services\WalletService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    public function store(RegisterRequest $request, WalletService $wallet): RedirectResponse
    {
        $referrer = $request->filled('referral_code')
            ? User::where('referral_code', $request->string('referral_code'))->first()
            : null;

        $user = DB::transaction(function () use ($request, $referrer): User {
            $user = User::create([
                'phone' => $request->string('phone'),
                'password' => $request->string('password'),
                'referral_code' => User::freshReferralCode(),
                'referred_by' => $referrer?->id,
            ]);

            Wallet::create(['user_id' => $user->id]);

            return $user;
        });

        // signup bonus, if the operator has one switched on
        $bonus = Setting::get('signup_bonus', ['amount' => 0, 'turnover_multiplier' => 1]);

        if (($bonus['amount'] ?? 0) > 0) {
            $wallet->grantBonus(
                $user,
                (int) $bonus['amount'],
                (int) ($bonus['turnover_multiplier'] ?? 1),
                'signup',
            );
        }

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('member')->with('toast', 'অ্যাকাউন্ট তৈরি হয়েছে');
    }
}
