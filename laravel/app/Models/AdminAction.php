<?php

namespace App\Models;

use App\Services\AuditLog;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One entry in the admin audit trail.
 *
 * Written through {@see AuditLog}; never updated or deleted, so
 * an approval can always be traced back to the admin who made it.
 */
#[Fillable([
    'admin_id', 'action', 'subject_type', 'subject_id',
    'target_user_id', 'amount', 'note', 'ip',
])]
class AdminAction extends Model
{
    protected function casts(): array
    {
        return ['amount' => 'integer'];
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    public function targetUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }
}
