import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth-next';
import { superAdminUsername } from '@/lib/admin-auth';
import { cleanPermissions, isAdminRole, type AdminRole, type StaffMutationResult } from '@/lib/admin-roles';
import {
  createStaff,
  listStaff,
  removeStaff,
  setStaffPassword,
  updateStaff,
} from '@/lib/admin-users-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Staff logins. Everything here is 'staff.manage', which only a super admin
    carries — an admin cannot promote themselves, and an agent cannot see the
    list at all. */
export async function GET() {
  const gate = await requireAdmin('staff.manage');
  if (!gate.ok) return gate.response;
  return json({ ok: true, staff: await listStaff() });
}

export async function POST(req: Request) {
  const gate = await requireAdmin('staff.manage');
  if (!gate.ok) return gate.response;
  const { session } = gate;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'invalid-json' }, 400);
  }

  if (!body || typeof body !== 'object') return json({ ok: false, reason: 'invalid-action' }, 400);
  const record = body as Record<string, unknown>;
  const id = String(record.id ?? '');

  let result: StaffMutationResult;
  switch (record.action) {
    case 'create':
      result = await createStaff({
        username: String(record.username ?? ''),
        password: String(record.password ?? ''),
        role: record.role as AdminRole,
        permissions: Array.isArray(record.permissions) ? record.permissions : undefined,
        createdBy: session.username,
        reserved: superAdminUsername(),
      });
      break;

    case 'set-role':
      if (!isAdminRole(record.role)) return json({ ok: false, reason: 'invalid-role' }, 400);
      result = await updateStaff(id, { role: record.role });
      break;

    case 'set-permissions':
      if (record.permissions === null) {
        result = await updateStaff(id, { permissions: null });
      } else if (Array.isArray(record.permissions)) {
        result = await updateStaff(id, { permissions: cleanPermissions(record.permissions) });
      } else {
        return json({ ok: false, reason: 'invalid-permissions' }, 400);
      }
      break;

    case 'set-active':
      result = await updateStaff(id, { active: Boolean(record.active) });
      break;

    case 'set-password':
      result = await setStaffPassword(id, String(record.password ?? ''));
      break;

    case 'remove':
      result = await removeStaff(id);
      break;

    default:
      return json({ ok: false, reason: 'invalid-action' }, 400);
  }

  return result.ok ? json(result) : json(result, 400);
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
