import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth-next';
import type { ContentMutationResult } from '@/lib/site-content';
import {
  addSlide,
  getSiteContent,
  isSlideKind,
  removeSlide,
  updateSlide,
} from '@/lib/site-content-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireAdmin('content.write');
  if (!gate.ok) return gate.response;
  return json({ ok: true, content: await getSiteContent() });
}

export async function POST(req: Request) {
  const gate = await requireAdmin('content.write');
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'invalid-json' }, 400);
  }

  if (!body || typeof body !== 'object') return json({ ok: false, reason: 'invalid-action' }, 400);
  const record = body as Record<string, unknown>;
  if (!isSlideKind(record.kind)) return json({ ok: false, reason: 'invalid-kind' }, 400);

  const id = String(record.id ?? '');
  let result: ContentMutationResult;
  switch (record.action) {
    case 'add':
      result = await addSlide(record.kind, record);
      break;
    case 'update':
      result = await updateSlide(record.kind, id, record);
      break;
    case 'remove':
      result = await removeSlide(record.kind, id);
      break;
    default:
      return json({ ok: false, reason: 'invalid-action' }, 400);
  }

  return result.ok ? json(result) : json(result, 400);
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
