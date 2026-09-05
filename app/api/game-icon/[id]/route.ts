import { readGameIcon } from '@/lib/game-control-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

/** Serves a tile image the admin uploaded. Public: it is artwork on the
    lobby. Cached briefly so a lobby full of tiles is not re-fetched on every
    navigation, but short enough that a replacement shows up quickly. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const icon = await readGameIcon(id);

  if (!icon) return new Response('Not found', { status: 404 });

  return new Response(new Uint8Array(icon.bytes), {
    headers: {
      'content-type': MIME[icon.ext] ?? 'application/octet-stream',
      'cache-control': 'public, max-age=60, stale-while-revalidate=300',
    },
  });
}
