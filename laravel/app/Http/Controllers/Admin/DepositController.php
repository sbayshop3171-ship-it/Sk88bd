<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Deposit;
use App\Services\AuditLog;
use App\Services\WalletService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DepositController extends Controller
{
    public function index(Request $request): Response
    {
        $state = $request->string('state', 'pending')->toString();

        return Inertia::render('Admin/Deposits', [
            'rows' => Deposit::query()
                ->with(['user:id,phone', 'channel:id,name'])
                ->when($state !== 'all', fn ($q) => $q->where('state', $state))
                ->latest()
                ->paginate(30)
                ->withQueryString(),
            'state' => $state,
        ]);
    }

    /** Approving is the only thing that credits a player's wallet. */
    public function update(Request $request, Deposit $deposit, WalletService $wallet, AuditLog $audit): RedirectResponse
    {
        $data = $request->validate([
            'state' => ['required', 'in:approved,rejected'],
            'admin_note' => ['nullable', 'string', 'max:255'],
        ]);

        if ($deposit->state !== 'pending') {
            return back()->with('toast', 'এই রিকোয়েস্ট আগেই রিভিউ হয়ে গেছে');
        }

        DB::transaction(function () use ($deposit, $data, $request, $wallet, $audit): void {
            $deposit->forceFill([
                'state' => $data['state'],
                'admin_note' => $data['admin_note'] ?? null,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ])->save();

            if ($data['state'] === 'approved') {
                $wallet->apply($deposit->user_id, 'deposit', $deposit->amount, "deposit:{$deposit->id}");
            }

            $audit->record(
                action: "deposit.{$data['state']}",
                subjectType: 'deposit',
                subjectId: $deposit->id,
                targetUser: $deposit->user_id,
                amount: $data['state'] === 'approved' ? $deposit->amount : null,
                note: $data['admin_note'] ?? null,
            );
        });

        return back()->with('toast', $data['state'] === 'approved'
            ? 'ডিপোজিট অনুমোদন হয়েছে — ব্যালেন্সে যোগ হয়েছে'
            : 'ডিপোজিট বাতিল হয়েছে');
    }
}
