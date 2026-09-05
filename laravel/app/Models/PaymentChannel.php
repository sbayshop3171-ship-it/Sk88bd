<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;

/**
 * A cashier channel (bKash, Nagad, ...).
 *
 * `account_no` / `account_name` are the operator's own receiving details.
 * They are hidden by default so a channel handed to an Inertia page can never
 * leak them; the admin screens select them explicitly.
 */
#[Fillable([
    'id', 'name', 'kind', 'glyph', 'art', 'account_no', 'account_name',
    'min_amount', 'max_amount', 'supports_deposit', 'supports_withdraw',
    'is_active', 'sort_order',
])]
#[Hidden(['account_no', 'account_name'])]
class PaymentChannel extends Model
{
    protected $keyType = 'string';

    public $incrementing = false;

    protected function casts(): array
    {
        return [
            'min_amount' => 'integer',
            'max_amount' => 'integer',
            'supports_deposit' => 'boolean',
            'supports_withdraw' => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}
