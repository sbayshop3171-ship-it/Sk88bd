<?php

namespace App\Support;

/**
 * Zeus Gate — the slot maths, provably fair.
 *
 * A six-by-five grid that pays anywhere: eight or more of the same symbol win
 * wherever they land, the winners are cleared, what is left falls down and new
 * symbols drop in — a tumble — until a drop pays nothing. Lightning orbs carry
 * a multiplier and stay on the grid; their total lifts whatever the tumbles
 * paid. Four bolts open fifteen free spins, where the orb total keeps building
 * across the whole round instead of resetting each spin.
 *
 * Measured over two million spins: 95.22% back to the player, a paying spin
 * every 26.8, the free spins every 230th spin and worth 93 stakes against the
 * hundred they cost to buy. Change a weight or a payout and those move — the
 * simulation in tests/Feature/ZeusRtpTest.php is what keeps them honest.
 *
 * A whole round — the drop, every tumble, every free spin — is replayed from
 * SHA-256(serverSeed:clientSeed:nonce) through {@see HashRng}, so the browser
 * is only ever animating a result this class already fixed. Once the round is
 * settled the server seed is published and the player can re-derive the same
 * grids themselves, which is what makes the outcome checkable rather than
 * merely promised.
 */
final class SlotEngine
{
    public const ROWS = 5;

    public const COLS = 6;

    /** Symbols of one kind needed to pay, wherever they sit. */
    public const MIN_CLUSTER = 8;

    /** The lightning bolt: never part of a cluster, and never tumbled away. */
    public const SCATTER = 'zap';

    /** A multiplier orb, written into the grid as `orb:<value>`. */
    public const ORB = 'orb';

    public const FREE_SPINS = 15;

    /** Bolts that open the free spins from a paid spin. */
    public const TRIGGER = 4;

    /** Bolts that extend them from inside, and by how many. */
    public const RETRIGGER = 3;

    public const RETRIGGER_SPINS = 5;

    /** Buying the free spins outright costs this many stakes. */
    public const BUY_COST = 100;

    /** Ceiling on a round, as a multiple of the stake. */
    public const MAX_WIN = 5000.0;

    /** Runaway guards. Neither is reachable in an honest round. */
    private const MAX_TUMBLES = 40;

    private const MAX_FREE_SPINS = 200;

    /** How often each symbol drops. Scatter and orb are the rare tail. */
    private const WEIGHTS = [
        'blue' => 169,
        'green' => 163,
        'purple' => 156,
        'gem' => 148,
        'cup' => 131,
        'ring' => 118,
        'glass' => 101,
        'crown' => 86,
        self::SCATTER => 22,
        self::ORB => 5,
    ];

    /**
     * The free spins run a reel of their own, richer in orbs.
     *
     * Without it the round has one dial: anything that makes the free spins
     * worth their buy price makes the paid game pay for itself as well. Two
     * reels let the paid spin sit under its edge while the bonus still lands
     * near the hundred stakes it costs.
     */
    private const FREE_WEIGHTS = [
        'blue' => 175,
        'green' => 168,
        'purple' => 160,
        'gem' => 150,
        'cup' => 130,
        'ring' => 115,
        'glass' => 95,
        'crown' => 78,
        self::SCATTER => 21,
        self::ORB => 12,
    ];

    /** symbol => pay as a multiple of the stake, for 8-9, 10-11 and 12+. */
    private const PAYTABLE = [
        'crown' => [10.0, 25.0, 50.0],
        'glass' => [2.5, 10.0, 25.0],
        'ring' => [2.0, 5.0, 15.0],
        'cup' => [1.2, 2.0, 12.0],
        'gem' => [0.6, 1.2, 8.0],
        'purple' => [0.4, 0.8, 5.0],
        'green' => [0.3, 0.6, 4.0],
        'blue' => [0.2, 0.5, 3.0],
    ];

    /** What an orb is worth, and how often it is worth it. */
    private const ORB_VALUES = [
        2 => 420, 3 => 260, 4 => 160, 5 => 110, 6 => 70, 8 => 45, 10 => 30, 12 => 20, 15 => 14, 20 => 10, 25 => 7, 50 => 3, 100 => 2, 250 => 1, 500 => 1,
    ];

    /** Bolt count => pay, on top of whatever the grid paid. */
    private const SCATTER_PAY = [4 => 3.0, 5 => 5.0, 6 => 100.0];

    public static function randomHex(int $bytes = 16): string
    {
        return bin2hex(random_bytes($bytes));
    }

    public static function hash(string $input): string
    {
        return hash('sha256', $input);
    }

    /**
     * Play one round out to the end and return the script the browser animates.
     *
     * `bought` skips the paid spin and drops straight into the free spins —
     * the player has already paid {@see BUY_COST} stakes for them.
     *
     * @return array{
     *     base: ?array<string, mixed>,
     *     free: array<int, array<string, mixed>>,
     *     free_spins: int,
     *     win_units: float,
     *     capped: bool,
     * }
     */
    public static function spin(string $serverSeed, string $clientSeed, int $nonce, bool $bought = false): array
    {
        $rng = new HashRng($serverSeed, $clientSeed, $nonce);

        $base = null;
        $units = 0.0;
        $spinsLeft = 0;

        if ($bought) {
            $spinsLeft = self::FREE_SPINS;
        } else {
            $carry = 0;
            $base = self::sequence($rng, $carry, false);
            $units += $base['win_units'];

            if ($base['scatters'] >= self::TRIGGER) {
                $units += self::scatterPay($base['scatters']);
                $spinsLeft = self::FREE_SPINS;
            }
        }

        $awarded = $spinsLeft;
        $free = [];
        $carry = 0;

        while ($spinsLeft > 0 && count($free) < self::MAX_FREE_SPINS) {
            $spinsLeft--;

            $sequence = self::sequence($rng, $carry, true);
            $units += $sequence['win_units'];

            if ($sequence['scatters'] >= self::RETRIGGER) {
                $spinsLeft += self::RETRIGGER_SPINS;
                $awarded += self::RETRIGGER_SPINS;
                $sequence['retrigger'] = true;
            }

            $sequence['spin'] = count($free) + 1;
            $sequence['of'] = $awarded;
            $free[] = $sequence;
        }

        return [
            'base' => $base,
            'free' => $free,
            'free_spins' => $awarded,
            // Two places, because that is the precision the round is stored
            // and paid at. Without it a round adding 1.2 to 4.5 comes back as
            // 5.700000000000001, the column rounds it to 5.70, and replaying
            // the seed no longer matches the row the player was paid on.
            'win_units' => round(min($units, self::MAX_WIN), 2),
            'capped' => $units > self::MAX_WIN,
        ];
    }

    /**
     * One drop and every tumble it sets off.
     *
     * `$carry` is the orb total. A paid spin passes a fresh zero and the orbs
     * lift that spin alone; the free spins pass the same variable through every
     * spin, which is what lets the multiplier build across the round.
     *
     * @return array<string, mixed>
     */
    private static function sequence(HashRng $rng, int &$carry, bool $free): array
    {
        $drop = self::drop($rng, $free);
        $grid = $drop;
        $steps = [];
        $paid = 0.0;

        while (count($steps) < self::MAX_TUMBLES) {
            $wins = self::wins($grid);

            if ($wins === []) {
                break;
            }

            $winning = array_column($wins, 'symbol');
            $cells = [];

            foreach ($grid as $r => $row) {
                foreach ($row as $c => $cell) {
                    if (in_array($cell, $winning, true)) {
                        $cells[] = [$r, $c];
                    }
                }
            }

            foreach ($wins as $win) {
                $paid += $win['pay'];
            }

            $grid = self::tumble($grid, $cells, $rng, $free);
            $steps[] = ['wins' => $wins, 'cells' => $cells, 'grid' => $grid];
        }

        // Orbs are sticky, so every one that landed during the sequence is
        // still on the final grid — summing it once is summing all of them.
        $orbs = self::orbTotal($grid);
        $carry = $free ? $carry + $orbs : $orbs;
        $multiplier = max(1, $carry);

        return [
            'grid' => $drop,
            'steps' => $steps,
            'scatters' => self::count($grid, self::SCATTER),
            'orbs' => $orbs,
            'multiplier' => $multiplier,
            'paid_units' => round($paid, 2),
            'win_units' => round($paid * $multiplier, 2),
        ];
    }

    /**
     * Every symbol on the grid that reached {@see MIN_CLUSTER}.
     *
     * @param  array<int, array<int, string>>  $grid
     * @return array<int, array{symbol: string, count: int, pay: float}>
     */
    private static function wins(array $grid): array
    {
        $counts = [];

        foreach ($grid as $row) {
            foreach ($row as $cell) {
                if (isset(self::PAYTABLE[$cell])) {
                    $counts[$cell] = ($counts[$cell] ?? 0) + 1;
                }
            }
        }

        $wins = [];

        foreach ($counts as $symbol => $count) {
            if ($count >= self::MIN_CLUSTER) {
                $tier = $count >= 12 ? 2 : ($count >= 10 ? 1 : 0);
                $wins[] = ['symbol' => $symbol, 'count' => $count, 'pay' => self::PAYTABLE[$symbol][$tier]];
            }
        }

        return $wins;
    }

    /** @return array<int, array<int, string>> */
    private static function drop(HashRng $rng, bool $free): array
    {
        $grid = [];

        for ($r = 0; $r < self::ROWS; $r++) {
            for ($c = 0; $c < self::COLS; $c++) {
                $grid[$r][$c] = self::symbol($rng, $free);
            }
        }

        return $grid;
    }

    /**
     * Clear the winning cells, let the survivors fall and top the columns up.
     *
     * @param  array<int, array<int, string>>  $grid
     * @param  array<int, array{0: int, 1: int}>  $cells
     * @return array<int, array<int, string>>
     */
    private static function tumble(array $grid, array $cells, HashRng $rng, bool $free): array
    {
        foreach ($cells as [$r, $c]) {
            $grid[$r][$c] = null;
        }

        for ($c = 0; $c < self::COLS; $c++) {
            $survivors = [];

            for ($r = self::ROWS - 1; $r >= 0; $r--) {
                if ($grid[$r][$c] !== null) {
                    $survivors[] = $grid[$r][$c];
                }
            }

            for ($r = self::ROWS - 1, $i = 0; $r >= 0; $r--, $i++) {
                $grid[$r][$c] = $survivors[$i] ?? self::symbol($rng, $free);
            }
        }

        return $grid;
    }

    private static function symbol(HashRng $rng, bool $free): string
    {
        $symbol = $rng->pick($free ? self::FREE_WEIGHTS : self::WEIGHTS);

        return $symbol === self::ORB
            ? self::ORB.':'.$rng->pick(self::ORB_VALUES)
            : $symbol;
    }

    /** @param  array<int, array<int, string>>  $grid */
    private static function count(array $grid, string $symbol): int
    {
        $n = 0;

        foreach ($grid as $row) {
            foreach ($row as $cell) {
                if ($cell === $symbol) {
                    $n++;
                }
            }
        }

        return $n;
    }

    /** @param  array<int, array<int, string>>  $grid */
    private static function orbTotal(array $grid): int
    {
        $total = 0;

        foreach ($grid as $row) {
            foreach ($row as $cell) {
                if (str_starts_with($cell, self::ORB.':')) {
                    $total += (int) substr($cell, strlen(self::ORB) + 1);
                }
            }
        }

        return $total;
    }

    private static function scatterPay(int $scatters): float
    {
        return self::SCATTER_PAY[min($scatters, 6)] ?? 0.0;
    }

    /**
     * The paytable, orb ladder and trigger rules, for the fairness screen.
     *
     * @return array<string, mixed>
     */
    public static function rules(): array
    {
        return [
            'rows' => self::ROWS,
            'cols' => self::COLS,
            'min_cluster' => self::MIN_CLUSTER,
            'paytable' => self::PAYTABLE,
            'scatter_pay' => self::SCATTER_PAY,
            'orb_values' => array_keys(self::ORB_VALUES),
            'free_spins' => self::FREE_SPINS,
            'trigger' => self::TRIGGER,
            'retrigger' => self::RETRIGGER,
            'retrigger_spins' => self::RETRIGGER_SPINS,
            'buy_cost' => self::BUY_COST,
            'max_win' => self::MAX_WIN,
        ];
    }
}
