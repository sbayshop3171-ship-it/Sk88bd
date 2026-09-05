<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The admin audit trail.
 *
 * Read-only by design: the value of the log is that nothing in the app can
 * rewrite it, so there is no update or delete action here.
 */
class AuditController extends Controller
{
    public function index(Request $request): Response
    {
        $action = $request->string('action')->toString();

        return Inertia::render('Admin/Audit', [
            'rows' => AdminAction::query()
                ->with(['admin:id,phone,display_name', 'targetUser:id,phone'])
                ->when($action !== '', fn ($q) => $q->where('action', $action))
                ->latest('id')
                ->paginate(50)
                ->withQueryString(),
            'action' => $action,
            'actions' => AdminAction::query()
                ->distinct()
                ->orderBy('action')
                ->pluck('action'),
        ]);
    }
}
