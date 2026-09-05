<?php

namespace App\Support;

use App\Models\Game;
use Illuminate\Support\Collection;

/**
 * Reads the `games` table into the shape the front end renders.
 *
 * The category order is fixed here rather than in the database because it is a
 * layout decision, not data the operator edits.
 */
class Catalogue
{
    /**
     * Games the site runs itself, and the route that plays them.
     *
     * A slug in here bypasses the /casino/{slug} placeholder entirely: there
     * is an engine behind it, so the lobby sends the player to the real table
     * instead of a "no provider connected" card.
     */
    public const ENGINES = [
        'aviator' => 'aviator',
        'zeus-gate' => 'zeus',
    ];

    /** Tabs in the sticky rail, in order. */
    public const TAB_ORDER = ['hot', 'sports', 'live', 'slot', 'poker', 'fish'];

    /** Every section on the home page, top to bottom. */
    public const HOME_SECTIONS = ['hot', 'sports', 'live', 'slot', 'poker', 'fish', 'esports', 'lottery'];

    public const PROVIDERS = [
        'PRAGMATIC', 'EVOLUTION', 'JILI', 'EZUGI', 'PG SOFT', 'NETENT',
        'SPRIBE', 'CQ9', 'JDB', 'HABANERO', 'BETGAMES', 'RELAX', 'KINGMAKER',
    ];

    /**
     * Active games grouped by category, ordered for display.
     *
     * @return array<string, Collection<int, Game>>
     */
    public static function sections(): array
    {
        $byCategory = Game::active()
            ->orderBy('sort_order')
            ->get()
            ->groupBy('category');

        $out = [];

        foreach (self::HOME_SECTIONS as $category) {
            $out[$category] = $byCategory->get($category, collect())->values();
        }

        return $out;
    }

    /**
     * @return array<int, string>
     */
    public static function providers(): array
    {
        return self::PROVIDERS;
    }

    /** The same slug can sit in several categories; the first placement wins. */
    public static function find(string $slug): ?Game
    {
        return Game::active()->where('slug', $slug)->orderBy('sort_order')->first();
    }
}
