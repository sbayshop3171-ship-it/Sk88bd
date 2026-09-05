<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The money ledger, across every player.
 *
 * `wallets.balance` is a running total; this is the append-only history behind
 * it. When a balance looks wrong, this screen is where the answer is.
 */
class LedgerController extends Controller
{
    /** Every `txn_kind` the ledger can hold, in the order the filter shows them. */
    private const KINDS = ['deposit', 'withdraw', 'bet', 'win', 'bonus', 'rebate', 'adjust'];

    public function index(Request $request): Response
    {
        $kind = $request->string('kind')->toString();
        $search = $request->string('q')->toString();

        $rows = Transaction::query()
            ->with('user:id,phone,display_name')
            ->when(in_array($kind, self::KINDS, true), fn ($q) => $q->where('kind', $kind))
            ->when($search !== '', fn ($q) => $q->whereHas(
                'user',
                fn ($u) => $u->where('phone', 'like', "%{$search}%")
            ))
            ->latest('id')
            ->paginate(50)
            ->withQueryString();

        // Totals cover the filtered set, not just the page being shown.
        $totals = Transaction::query()
            ->when(in_array($kind, self::KINDS, true), fn ($q) => $q->where('kind', $kind))
            ->when($search !== '', fn ($q) => $q->whereHas(
                'user',
                fn ($u) => $u->where('phone', 'like', "%{$search}%")
            ))
            ->selectRaw('coalesce(sum(case when amount > 0 then amount end), 0) as credits')
            ->selectRaw('coalesce(sum(case when amount < 0 then amount end), 0) as debits')
            ->first();

        return Inertia::render('Admin/Ledger', [
            'rows' => $rows,
            'kind' => $kind,
            'q' => $search,
            'kinds' => self::KINDS,
            'totals' => [
                'credits' => (int) ($totals->credits ?? 0),
                'debits' => (int) ($totals->debits ?? 0),
            ],
        ]);
    }
}
