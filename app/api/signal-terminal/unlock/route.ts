import { NextResponse } from 'next/server';
import { unlockSignalApp } from '@/lib/signal-app-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'invalid-json' }, 400);
  }

  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const result = await unlockSignalApp({
    appKey: String(record.appKey ?? record.key ?? ''),
    deviceId: String(record.deviceId ?? ''),
    appVersion: String(record.appVersion ?? ''),
  });

  return json(result, result.ok ? 200 : statusFor(result.reason));
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders(),
  });
}

function corsHeaders() {
  return {
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
  };
}

function statusFor(reason: string) {
  if (reason === 'locked') return 423;
  if (reason === 'device-limit') return 409;
  return 401;
}
