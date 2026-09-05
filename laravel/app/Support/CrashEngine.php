<?php

namespace App\Support;

/**
 * Aviator — crash maths, provably fair.
 *
 * Commit–reveal: before betting opens the round's server seed is generated and
 * only its SHA-256 hash is shown. The crash point is derived from
 * SHA-256(serverSeed:clientSeed:nonce). After the bust the seed is published,
 * so anyone can re-hash it, check it matches the committed hash and recompute
 * the crash point — proving the round was fixed before any bet was placed.
 *
 * The seed lives here, on the server, which is what makes that guarantee real.
 * The browser copy of these constants (resources/js/lib/aviator.ts) only draws
 * the curve; it never decides an outcome.
 */
class CrashEngine
{
    public const HOUSE_EDGE = 0.03;

    /** Multiplier growth per second of flight. 2x lands near 11s, 10x near 37s. */
    public const GROWTH = 0.0625;

    public const BETTING_MS = 6000;

    public const CRASHED_MS = 3500;

    public static function randomHex(int $bytes = 16): string
    {
        return bin2hex(random_bytes($bytes));
    }

    public static function hash(string $input): string
    {
        return hash('sha256', $input);
    }

    /**
     * Crash point from a round hash.
     *
     * With probability HOUSE_EDGE the round busts instantly at 1.00x. Otherwise
     * the multiplier is drawn so that P(crash >= m) ~ 1/m, which makes every
     * cash-out target equally (un)profitable before the edge.
     */
    public static function crashFromHash(string $hashHex): float
    {
        // 52 bits is the most that survives a float without rounding
        $r = hexdec(substr($hashHex, 0, 13)) / 2 ** 52;

        if ($r < self::HOUSE_EDGE) {
            return 1.0;
        }

        return max(1.0, floor((1 / (1 - $r)) * 100) / 100);
    }

    /** Multiplier reached after `$elapsedMs` of flight. */
    public static function multiplierAt(float $elapsedMs): float
    {
        return exp(self::GROWTH * ($elapsedMs / 1000));
    }

    /** Flight time in ms needed to reach `$multiplier`. */
    public static function timeToReach(float $multiplier): float
    {
        return (log($multiplier) / self::GROWTH) * 1000;
    }
}
