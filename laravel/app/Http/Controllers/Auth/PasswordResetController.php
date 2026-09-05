<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Reset is by SMS OTP, which needs a paid gateway the project does not have
 * yet. The form validates and acknowledges; wiring the send is a one-method
 * change here once a provider is bought.
 */
class PasswordResetController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/ForgotPassword');
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate(
            ['phone' => ['required', 'string', 'regex:/^01\d{9}$/']],
            ['phone.regex' => 'সঠিক ১১ ডিজিটের নাম্বার দিন'],
        );

        return back()->with('toast', 'SMS গেটওয়ে যুক্ত হলে OTP পাঠানো হবে');
    }
}
