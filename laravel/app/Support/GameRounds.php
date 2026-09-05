<?php

namespace App\Support;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Every engine's rounds, as one list.
 *
 * Each game keeps its own table because each has its own shape — a crash round
 * has a bust multiplier, a slot round has a win multiplier and a free-spin
 * count. The admin does not care about the shape: it wants who staked what on
 * which game and what came back. This flattens them to those columns.
 *
 * A new engine belongs here the day it ships, or it is invisible to whoever is
 * watching the money.
 */
class GameRounds
{
    /** Label => the query that contributes its rounds. */
    public static function games(): array
    {
        return [
            'aviator' => 'Aviator',
            'zeus' => 'Zeus Gate',
        ];
    }

    /**
     * One row per round: game, player, what it cost, what it paid.
     *
     * Left as a query builder so callers can filter and paginate it; ordering
     * is theirs to choose.
     */
    public static function query(): Builder
    {
        // Aviator is per seat: a player can hold two bets in one round, and
        // each is its own stake and its own payout.
        $aviator = DB::table('aviator_bets as b')
            ->join('aviator_rounds as r', 'r.id', '=', 'b.round_id')
            ->select([
                DB::raw("'aviator' as game"),
                'b.user_id',
                'b.round_id',
                'b.stake as cost',
                'b.payout',
                DB::raw('r.crash_at as detail'),
                'b.created_at',
            ]);

        $zeus = DB::table('zeus_rounds')
            ->select([
                DB::raw("'zeus' as game"),
                'user_id',
                DB::raw('id as round_id'),
                'cost',
                'payout',
                DB::raw('win_units as detail'),
                'created_at',
            ]);

        return DB::query()
            ->fromSub($aviator->unionAll($zeus), 'rounds')
            ->leftJoin('users as u', 'u.id', '=', 'rounds.user_id')
            ->select('rounds.*', 'u.phone');
    }
}
