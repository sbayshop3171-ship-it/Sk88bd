<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One crash round.
 *
 * `server_seed` is hidden so it cannot ride along to the client while the
 * round is still in the air — that secrecy is the whole fairness commitment.
 * AviatorController reveals it explicitly once `crashed_at` is set.
 */
#[Fillable(['user_id', 'server_seed', 'server_seed_hash', 'client_seed', 'nonce', 'crash_at', 'started_at', 'crashed_at'])]
#[Hidden(['server_seed'])]
class AviatorRound extends Model
{
    protected function casts(): array
    {
        return [
            'crash_at' => 'float',
            'nonce' => 'integer',
            'started_at' => 'datetime',
            'crashed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function bets(): HasMany
    {
        return $this->hasMany(AviatorBet::class, 'round_id');
    }
}
