<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Props every page receives.
     *
     * `auth.user` is the shape the old Supabase AuthProvider exposed, so the
     * ported components read it unchanged.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $wallet = $user?->wallet;

        return [
            ...parent::share($request),

            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'phone' => $user->phone,
                    'display_name' => $user->display_name,
                    'role' => $user->role,
                    'vip_level' => $user->vip_level,
                    'referral_code' => $user->referral_code,
                    'created_at' => $user->created_at?->toDateString(),
                ] : null,

                'wallet' => $wallet ? [
                    'balance' => $wallet->balance,
                    'bonus_balance' => $wallet->bonus_balance,
                    'turnover_need' => $wallet->turnover_need,
                    'turnover_done' => $wallet->turnover_done,
                ] : null,
            ],

            // one-shot messages the UIProvider turns into a toast
            'flash' => [
                'toast' => $request->session()->get('toast'),
            ],
        ];
    }
}
