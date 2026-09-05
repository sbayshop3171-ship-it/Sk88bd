<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A claimed daily check-in bonus. */
#[Fillable(['user_id', 'checked_on', 'amount'])]
class DailyCheckin extends Model
{
    protected function casts(): array
    {
        return [
            'checked_on' => 'date',
            'amount' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
