<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['round_id', 'user_id', 'seat', 'stake', 'auto_at', 'cashed_at', 'payout'])]
class AviatorBet extends Model
{
    protected function casts(): array
    {
        return [
            'stake' => 'integer',
            'payout' => 'integer',
            'auto_at' => 'float',
            'cashed_at' => 'float',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function round(): BelongsTo
    {
        return $this->belongsTo(AviatorRound::class, 'round_id');
    }
}
