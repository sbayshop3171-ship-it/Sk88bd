<?php

namespace App\Support;

/**
 * A deterministic stream of floats in [0, 1), derived from a seed triple.
 *
 * Every draw comes out of SHA-256(serverSeed:clientSeed:nonce:cursor), so the
 * whole stream — and therefore a whole slot round — replays exactly from the
 * three seeds alone. That is what lets a player re-run a finished round once
 * the server seed is published and check the operator did not touch it.
 *
 * Draws are taken 52 bits at a time, the most a float carries without
 * rounding, which matches how {@see CrashEngine} reads a round hash.
 */
final class HashRng
{
    /** Hex digits per draw: 13 * 4 bits = 52. */
    private const CHUNK = 13;

    /** A 64-hex digest yields four whole chunks; the tail is discarded. */
    private const DRAWS_PER_BLOCK = 4;

    private string $block = '';

    private int $cursor = 0;

    private int $offset = 0;

    public function __construct(
        private readonly string $serverSeed,
        private readonly string $clientSeed,
        private readonly int $nonce,
    ) {}

    /** The next float in [0, 1). */
    public function float(): float
    {
        if ($this->block === '' || $this->offset >= self::DRAWS_PER_BLOCK) {
            $this->block = hash('sha256', "{$this->serverSeed}:{$this->clientSeed}:{$this->nonce}:{$this->cursor}");
            $this->cursor++;
            $this->offset = 0;
        }

        $hex = substr($this->block, $this->offset * self::CHUNK, self::CHUNK);
        $this->offset++;

        return hexdec($hex) / 2 ** 52;
    }

    /** An integer in [0, $bound). */
    public function int(int $bound): int
    {
        return (int) floor($this->float() * $bound);
    }

    /**
     * Pick a key from a key => weight map, in proportion to the weights.
     *
     * @param  array<string, int>  $weights
     */
    public function pick(array $weights): string
    {
        $roll = $this->float() * array_sum($weights);

        foreach ($weights as $key => $weight) {
            $roll -= $weight;

            if ($roll < 0) {
                return (string) $key;
            }
        }

        // unreachable while the weights are positive; float drift is the only
        // way here, and the heaviest tail entry is the honest answer
        return (string) array_key_last($weights);
    }
}
