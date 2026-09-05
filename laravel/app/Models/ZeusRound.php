<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One spin, stored as its inputs and its outcome.
 *
 * The grids are not kept: (seed, client seed, nonce) replays them exactly
 * through App\Support\SlotEngine, so the row records what was staked and paid
 * and lets the maths be re-derived rather than trusted.
 */
#[Fillable(['seed_id', 'user_id', 'nonce', 'stake', 'cost', 'bought', 'win_units', 'payout', 'free_spins'])]
class ZeusRound extends Model
{
    protected function casts(): array
    {
        return [
            'nonce' => 'integer',
            'bought' => 'boolean',
            'win_units' => 'float',
            'free_spins' => 'integer',
        ];
    }

    public function seed(): BelongsTo
    {
        return $this->belongsTo(ZeusSeed::class, 'seed_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
