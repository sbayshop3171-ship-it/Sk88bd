<?php

namespace App\Services;

use App\Models\AdminAction;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Records what an admin did.
 *
 * Kept deliberately small: callers pass the action name and whatever context
 * they have, and the acting admin plus the request IP are filled in here so no
 * controller has to remember them.
 */
class AuditLog
{
    public function __construct(private Request $request) {}

    /**
     * @param  string  $action  dotted verb, e.g. 'deposit.approve'
     * @param  int|string|null  $subjectId  primary key of the record acted on
     * @param  int|null  $amount  signed paisa, when the action moved money
     */
    public function record(
        string $action,
        ?string $subjectType = null,
        int|string|null $subjectId = null,
        User|int|null $targetUser = null,
        ?int $amount = null,
        ?string $note = null,
    ): AdminAction {
        $admin = $this->request->user();

        return AdminAction::create([
            'admin_id' => $admin?->id,
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId === null ? null : (string) $subjectId,
            'target_user_id' => $targetUser instanceof User ? $targetUser->id : $targetUser,
            'amount' => $amount,
            'note' => $note,
            'ip' => $this->request->ip(),
        ]);
    }
}
