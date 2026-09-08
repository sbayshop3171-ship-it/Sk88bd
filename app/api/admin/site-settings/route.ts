import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth-next';
import { getSiteSettings, updateSiteSettings } from '@/lib/site-settings-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireAdmin('settings.write');
  if (!gate.ok) return gate.response;
  return json({ ok: true, settings: await getSiteSettings() });
}

/** Partial update: only the keys present in the body change. */
export async function POST(req: Request) {
  const gate = await requireAdmin('settings.write');
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'invalid-json' }, 400);
  }

  const result = await updateSiteSettings(body);
  return result.ok ? json(result) : json(result, 400);
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
