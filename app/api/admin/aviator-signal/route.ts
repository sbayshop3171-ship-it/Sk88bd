import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth-next';
import {
  adminAviatorState,
  getAviatorSignalState,
  updateAviatorSignal,
} from '@/lib/aviator-signal-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireAdmin('signal.write');
  if (!gate.ok) return gate.response;

  const state = await getAviatorSignalState();
  return json(adminAviatorState(state));
}

export async function POST(req: Request) {
  const gate = await requireAdmin('signal.write');
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'invalid-json' }, 400);
  }

  const input = normalizeBody(body);
  if (!input) return json({ ok: false, reason: 'invalid-action' }, 400);

  const state = await updateAviatorSignal(input);
  return json(adminAviatorState(state));
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
