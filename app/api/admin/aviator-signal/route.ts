import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  getAviatorSignalState,
  publicAviatorState,
  updateAviatorSignal,
} from '@/lib/aviator-signal-store';
import { ADMIN_SESSION_COOKIE, getAdminSessionFromCookie } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAuthorized())) return json({ ok: false, reason: 'unauthorized' }, 401);

  const state = await getAviatorSignalState();
  return json(publicAviatorState(state));
}

export async function POST(req: Request) {
  if (!(await isAuthorized())) return json({ ok: false, reason: 'unauthorized' }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'invalid-json' }, 400);
  }

  const input = normalizeBody(body);
  if (!input) return json({ ok: false, reason: 'invalid-action' }, 400);

  const state = await updateAviatorSignal(input);
  return json(publicAviatorState(state));
}

async function isAuthorized() {
  const cookieStore = await cookies();
  const session = await getAdminSessionFromCookie(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  return Boolean(session);
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
      action: 'set-manual' | 'toggle-auto' | 'toggle-signal' | 'regenerate' | 'speed-demo';
      targetX?: number;
      autoMode?: boolean;
      signalActive?: boolean;
    }
  | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const action = record.action;

  if (action === 'set-manual') {
    return { action, targetX: Number(record.targetX) };
  }
  if (action === 'toggle-auto') {
    return { action, autoMode: Boolean(record.autoMode) };
  }
  if (action === 'toggle-signal') {
    return { action, signalActive: Boolean(record.signalActive) };
  }
  if (action === 'regenerate' || action === 'speed-demo') {
    return { action };
  }
  return null;
}
