<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One committed server seed and the spins played against it.
 *
 * `server_seed` is hidden so it cannot ride along to the client while the pair
 * is still in use — that secrecy is the fairness commitment. ZeusController
 * publishes it only when the pair is retired, and `revealed_at` records that
 * a pair, once shown, is never played again.
 */
#[Fillable(['user_id', 'server_seed', 'server_seed_hash', 'client_seed', 'nonce', 'revealed_at'])]
#[Hidden(['server_seed'])]
class ZeusSeed extends Model
{
    protected function casts(): array
    {
        return [
            'nonce' => 'integer',
            'revealed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function rounds(): HasMany
    {
        return $this->hasMany(ZeusRound::class, 'seed_id');
    }
}
