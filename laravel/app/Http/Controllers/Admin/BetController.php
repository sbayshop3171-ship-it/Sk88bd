<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\GameRounds;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Every round played on the site's own engines.
 *
 * The ledger already holds the money side, but a `bet` line there says only
 * that a stake left a wallet — not which game took it or what the round did.
 * This is the screen for "who is winning, and at what".
 */
class BetController extends Controller
{
    public function index(Request $request): Response
    {
        $game = $request->string('game')->toString();
        $search = $request->string('q')->toString();

        $filtered = fn () => GameRounds::query()
            ->when(array_key_exists($game, GameRounds::games()), fn ($q) => $q->where('rounds.game', $game))
            ->when($search !== '', fn ($q) => $q->where('u.phone', 'like', "%{$search}%"));

        $totals = $filtered()
            ->selectRaw('count(*) as rounds')
            ->selectRaw('coalesce(sum(rounds.cost), 0) as staked')
            ->selectRaw('coalesce(sum(rounds.payout), 0) as paid')
            ->reorder()
            ->first();

        return Inertia::render('Admin/Bets', [
            'rows' => $filtered()->orderByDesc('rounds.created_at')->paginate(50)->withQueryString(),
            'game' => $game,
            'q' => $search,
            'games' => GameRounds::games(),
            'totals' => [
                'rounds' => (int) ($totals->rounds ?? 0),
                'staked' => (int) ($totals->staked ?? 0),
                'paid' => (int) ($totals->paid ?? 0),
            ],
        ]);
    }
}
