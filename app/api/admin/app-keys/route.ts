import { NextResponse } from 'next/server';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { getSignalAppKeyAdminState, updateSignalAppKeyAdmin } from '@/lib/signal-app-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await getCurrentAdminSession())) return json({ ok: false, reason: 'unauthorized' }, 401);
  return json(await getSignalAppKeyAdminState());
}

export async function POST(req: Request) {
  if (!(await getCurrentAdminSession())) return json({ ok: false, reason: 'unauthorized' }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'invalid-json' }, 400);
  }

  const input = normalizeBody(body);
  if (!input) return json({ ok: false, reason: 'invalid-action' }, 400);
  return json(await updateSignalAppKeyAdmin(input));
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'cache-control': 'no-store',
    },
  });
}

function normalizeBody(body: unknown):
  | {
      action: 'generate' | 'toggle' | 'revoke' | 'reset-devices' | 'delete' | 'update';
      keyId?: string;
      name?: string;
      maxDevices?: number;
      expiresAt?: string | null;
      note?: string;
      active?: boolean;
    }
  | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const action = record.action;

  if (action === 'generate') {
    return {
      action,
      name: String(record.name ?? ''),
      maxDevices: Number(record.maxDevices ?? 1),
      expiresAt: String(record.expiresAt ?? '') || null,
      note: String(record.note ?? ''),
    };
  }

  if (action === 'toggle') {
    return {
      action,
      keyId: String(record.keyId ?? ''),
      active: Boolean(record.active),
    };
  }

  if (action === 'revoke' || action === 'reset-devices' || action === 'delete') {
    return {
      action,
      keyId: String(record.keyId ?? ''),
    };
  }

  if (action === 'update') {
    return {
      action,
      keyId: String(record.keyId ?? ''),
      name: String(record.name ?? ''),
      maxDevices: Number(record.maxDevices ?? 1),
      expiresAt: String(record.expiresAt ?? '') || null,
      note: String(record.note ?? ''),
    };
  }

  return null;
}
