<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Denormalised balance. Every write goes through App\Services\WalletService so
 * the ledger in `transactions` and this row can never drift apart.
 *
 * All amounts are paisa.
 */
#[Fillable(['user_id', 'balance', 'bonus_balance', 'turnover_need', 'turnover_done'])]
class Wallet extends Model
{
    protected $primaryKey = 'user_id';

    public $incrementing = false;

    protected function casts(): array
    {
        return [
            'balance' => 'integer',
            'bonus_balance' => 'integer',
            'turnover_need' => 'integer',
            'turnover_done' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
