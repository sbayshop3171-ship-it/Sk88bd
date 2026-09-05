<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Deposit;
use App\Models\PaymentChannel;
use App\Models\Setting;
use App\Models\Withdrawal;
use App\Services\AuditLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Settings', [
            'site' => Setting::get('site'),
            'support' => Setting::get('support'),
            'signupBonus' => Setting::get('signup_bonus', ['amount' => 0, 'turnover_multiplier' => 10]),
            'checkinBonus' => Setting::get('checkin_bonus', ['amount' => 0, 'turnover_multiplier' => 10]),
            'appLinks' => Setting::get('app_links', ['android' => null, 'ios' => null]),
            'referral' => Setting::get('referral', ['rate_bp' => 0]),
            // account_no is Hidden on the model; this screen is the one place
            // it is meant to be visible, so it is selected explicitly
            'channels' => PaymentChannel::orderBy('sort_order')
                ->get()
                ->map(fn (PaymentChannel $c) => [
                    ...$c->toArray(),
                    'account_no' => $c->account_no,
                    'account_name' => $c->account_name,
                ]),
        ]);
    }

    public function updateSite(Request $request, AuditLog $audit): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:64'],
            'domain' => ['required', 'string', 'max:120'],
            'currency' => ['required', 'string', 'max:8'],
            'email' => ['required', 'email', 'max:120'],
            'whatsapp' => ['nullable', 'string', 'max:255'],
            'telegram' => ['nullable', 'string', 'max:255'],
            'facebook' => ['nullable', 'string', 'max:255'],
        ]);

        Setting::put('site', [
            'name' => $data['name'],
            'domain' => $data['domain'],
            'currency' => $data['currency'],
        ]);

        Setting::put('support', [
            'email' => $data['email'],
            'whatsapp' => $data['whatsapp'] ?? null,
            'telegram' => $data['telegram'] ?? null,
            'facebook' => $data['facebook'] ?? null,
        ]);

        $audit->record(action: 'settings.site', subjectType: 'settings', subjectId: 'site');

        return back()->with('toast', 'সেটিংস সেভ হয়েছে');
    }

    /**
     * The bonuses the site hands out on its own.
     *
     * Both were seeded and then read by the code that grants them, but nothing
     * could change them short of a database edit — so the sign-up bonus sat at
     * zero and the offer on the promotions page was a promise the site did not
     * keep. The turnover multiplier is the important half: a bonus granted
     * without one is withdrawable cash.
     */
    public function updateBonuses(Request $request, AuditLog $audit): RedirectResponse
    {
        $data = $request->validate([
            'signup_amount' => ['required', 'numeric', 'min:0'],
            'signup_turnover' => ['required', 'integer', 'min:0', 'max:100'],
            'checkin_amount' => ['required', 'numeric', 'min:0'],
            'checkin_turnover' => ['required', 'integer', 'min:0', 'max:100'],
            'referral_rate' => ['required', 'numeric', 'min:0', 'max:60'],
            'android' => ['nullable', 'url:https', 'max:255'],
            'ios' => ['nullable', 'url:https', 'max:255'],
        ], [
            'referral_rate.max' => 'রেফারেল কমিশন ৬০% এর বেশি দেওয়া যাবে না',
        ]);

        Setting::put('signup_bonus', [
            'amount' => (int) round($data['signup_amount'] * 100),
            'turnover_multiplier' => (int) $data['signup_turnover'],
        ]);

        Setting::put('checkin_bonus', [
            'amount' => (int) round($data['checkin_amount'] * 100),
            'turnover_multiplier' => (int) $data['checkin_turnover'],
        ]);

        // stored in basis points so the rate survives as an integer
        Setting::put('referral', [
            'rate_bp' => (int) round($data['referral_rate'] * 100),
        ]);

        Setting::put('app_links', [
            'android' => ($data['android'] ?? '') ?: null,
            'ios' => ($data['ios'] ?? '') ?: null,
        ]);

        $audit->record(
            action: 'settings.bonus',
            subjectType: 'settings',
            subjectId: 'bonus',
            note: "signup ৳{$data['signup_amount']} @{$data['signup_turnover']}x, checkin ৳{$data['checkin_amount']} @{$data['checkin_turnover']}x, referral {$data['referral_rate']}%",
        );

        return back()->with('toast', 'বোনাস সেটিংস সেভ হয়েছে');
    }

    /**
     * Add a cashier channel.
     *
     * The id is the handle the rest of the system stores against a deposit, so
     * it is chosen here and never changes; only the display name does.
     */
    public function storeChannel(Request $request, AuditLog $audit): RedirectResponse
    {
        $data = $request->validate([
            'id' => ['required', 'string', 'max:32', 'regex:/^[a-z0-9-]+$/', 'unique:payment_channels,id'],
            'name' => ['required', 'string', 'max:64'],
            'kind' => ['required', Rule::in(['mobile', 'bank', 'crypto'])],
            'glyph' => ['nullable', 'string', 'max:16'],
            'account_no' => ['nullable', 'string', 'max:64'],
            'account_name' => ['nullable', 'string', 'max:64'],
            'min_amount' => ['required', 'numeric', 'min:0'],
            'max_amount' => ['required', 'numeric', 'gt:min_amount'],
            'supports_deposit' => ['boolean'],
            'supports_withdraw' => ['boolean'],
            'is_active' => ['boolean'],
        ], [
            'id.regex' => 'আইডিতে শুধু ছোট হাতের অক্ষর, সংখ্যা আর - চলবে',
            'id.unique' => 'এই আইডির চ্যানেল আগেই আছে',
        ]);

        PaymentChannel::create([
            ...$data,
            'min_amount' => (int) round($data['min_amount'] * 100),
            'max_amount' => (int) round($data['max_amount'] * 100),
            'sort_order' => (int) PaymentChannel::max('sort_order') + 1,
        ]);

        $audit->record(action: 'channel.create', subjectType: 'payment_channel', subjectId: $data['id']);

        return back()->with('toast', "{$data['name']} যোগ হয়েছে");
    }

    /**
     * Retire a channel.
     *
     * Refused while any deposit or withdrawal still points at it: those rows
     * name the channel a player actually paid through, and losing that would
     * make the cashier history unreadable. Deactivating is the way to take a
     * channel off the cashier without erasing where the money went.
     */
    public function destroyChannel(PaymentChannel $channel, AuditLog $audit): RedirectResponse
    {
        $used = Deposit::where('channel_id', $channel->id)->exists()
            || Withdrawal::where('channel_id', $channel->id)->exists();

        if ($used) {
            return back()->with('toast', 'এই চ্যানেলে লেনদেন হয়ে গেছে — মুছে না ফেলে বন্ধ করুন');
        }

        $channel->delete();

        $audit->record(action: 'channel.delete', subjectType: 'payment_channel', subjectId: $channel->id);

        return back()->with('toast', "{$channel->name} মুছে ফেলা হয়েছে");
    }

    /** The operator's receiving account numbers live here, never in the front end. */
    public function updateChannel(Request $request, PaymentChannel $channel, AuditLog $audit): RedirectResponse
    {
        $data = $request->validate([
            'account_no' => ['nullable', 'string', 'max:64'],
            'account_name' => ['nullable', 'string', 'max:64'],
            'min_amount' => ['required', 'numeric', 'min:0'],
            'max_amount' => ['required', 'numeric', 'gt:min_amount'],
            'supports_deposit' => ['boolean'],
            'supports_withdraw' => ['boolean'],
            'is_active' => ['boolean'],
        ]);

        $previousAccount = $channel->account_no;

        $channel->update([
            ...$data,
            'min_amount' => (int) round($data['min_amount'] * 100),
            'max_amount' => (int) round($data['max_amount'] * 100),
        ]);

        // The receiving number decides where every player's money goes, so a
        // change to it is worth a line in the audit trail on its own.
        $audit->record(
            action: 'channel.update',
            subjectType: 'payment_channel',
            subjectId: $channel->id,
            note: $previousAccount === $channel->account_no
                ? 'limits/flags'
                : "account_no: {$previousAccount} → {$channel->account_no}",
        );

        return back()->with('toast', "{$channel->name} আপডেট হয়েছে");
    }
}
