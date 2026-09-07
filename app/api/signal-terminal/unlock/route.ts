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
    caller: callerOf(req),
  });

  return json(result, result.ok ? 200 : statusFor(result.reason));
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

/* Behind nginx and Cloudflare the socket address is the proxy, so the
   forwarded chain is read first. A forged header only costs the sender their
   own lockout bucket, never anybody else's access. */
function callerOf(req: Request) {
  const forwarded = req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]
    ?? req.headers.get('x-real-ip');
  return forwarded?.trim().slice(0, 64) || 'unknown';
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
