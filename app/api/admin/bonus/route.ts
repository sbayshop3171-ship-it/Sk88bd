import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth-next';
import { getBonusConfig, updateBonusConfig } from '@/lib/bonus-config-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireAdmin('cashier.config');
  if (!gate.ok) return gate.response;
  return json({ ok: true, config: await getBonusConfig() });
}

export async function POST(req: Request) {
  const gate = await requireAdmin('cashier.config');
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'invalid-json' }, 400);
  }

  const result = await updateBonusConfig(body);
  return result.ok ? json(result) : json(result, 400);
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
