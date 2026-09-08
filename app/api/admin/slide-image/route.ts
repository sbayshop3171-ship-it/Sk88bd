import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth-next';
import { SLIDE_IMAGE_MAX_BYTES, SLIDE_IMAGE_TYPES } from '@/lib/site-content';
import { clearSlideImage, isSlideKind, saveSlideImage } from '@/lib/site-content-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Upload a picture for one banner or announcement card.
    multipart/form-data: kind, id, file. */
export async function POST(req: Request) {
  const gate = await requireAdmin('content.write');
  if (!gate.ok) return gate.response;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ ok: false, reason: 'invalid-form' }, 400);
  }

  const kind = form.get('kind');
  const id = String(form.get('id') ?? '');
  const file = form.get('file');
  if (!isSlideKind(kind)) return json({ ok: false, reason: 'invalid-kind' }, 400);
  if (!(file instanceof File) || file.size === 0) return json({ ok: false, reason: 'no-file' }, 400);

  const ext = SLIDE_IMAGE_TYPES[file.type];
  if (!ext) return json({ ok: false, reason: 'bad-type' }, 400);
  if (file.size > SLIDE_IMAGE_MAX_BYTES) return json({ ok: false, reason: 'too-large' }, 400);

  const result = await saveSlideImage(kind, id, ext, Buffer.from(await file.arrayBuffer()));
  return result.ok ? json(result) : json(result, 400);
}

/** Remove the picture so the slide falls back to its drawn art. */
export async function DELETE(req: Request) {
  const gate = await requireAdmin('content.write');
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const kind = url.searchParams.get('kind');
  const id = url.searchParams.get('id') ?? '';
  if (!isSlideKind(kind)) return json({ ok: false, reason: 'invalid-kind' }, 400);

  const result = await clearSlideImage(kind, id);
  return result.ok ? json(result) : json(result, 400);
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
