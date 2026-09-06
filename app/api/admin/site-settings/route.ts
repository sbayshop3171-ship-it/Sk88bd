import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, getAdminSessionFromCookie } from '@/lib/admin-auth';
import { getSiteSettings, updateSiteSettings } from '@/lib/site-settings-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAuthorized())) return json({ ok: false, reason: 'unauthorized' }, 401);
  return json({ ok: true, settings: await getSiteSettings() });
}

/** Partial update: only the keys present in the body change. */
export async function POST(req: Request) {
  if (!(await isAuthorized())) return json({ ok: false, reason: 'unauthorized' }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'invalid-json' }, 400);
  }

  const result = await updateSiteSettings(body);
  return result.ok ? json(result) : json(result, 400);
}

async function isAuthorized() {
  const cookieStore = await cookies();
  return Boolean(await getAdminSessionFromCookie(cookieStore.get(ADMIN_SESSION_COOKIE)?.value));
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
