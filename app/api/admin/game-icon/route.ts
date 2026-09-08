import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth-next';
import { ICON_MAX_BYTES, ICON_TYPES } from '@/lib/game-control';
import { clearGameIcon, saveGameIcon } from '@/lib/game-control-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Upload a tile image for one game. multipart/form-data: gameId + file. */
export async function POST(req: Request) {
  const gate = await requireAdmin('games.write');
  if (!gate.ok) return gate.response;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ ok: false, reason: 'invalid-form' }, 400);
  }

  const gameId = String(form.get('gameId') ?? '');
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return json({ ok: false, reason: 'no-file' }, 400);

  const ext = ICON_TYPES[file.type];
  if (!ext) return json({ ok: false, reason: 'bad-type' }, 400);
  if (file.size > ICON_MAX_BYTES) return json({ ok: false, reason: 'too-large' }, 400);

  const result = await saveGameIcon(gameId, ext, Buffer.from(await file.arrayBuffer()));
  return result.ok ? json(result) : json(result, 400);
}

/** Remove the upload so the game falls back to its catalogue art. */
export async function DELETE(req: Request) {
  const gate = await requireAdmin('games.write');
  if (!gate.ok) return gate.response;

  const gameId = new URL(req.url).searchParams.get('gameId') ?? '';
  const result = await clearGameIcon(gameId);
  return result.ok ? json(result) : json(result, 400);
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
