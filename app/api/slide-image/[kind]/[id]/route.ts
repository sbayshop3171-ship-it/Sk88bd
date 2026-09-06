import { isSlideKind, readSlideImage } from '@/lib/site-content-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

/** Serves a banner / announcement picture the admin uploaded. Public: it is
    promo art on the home page. Cached briefly so the carousel is not
    re-fetched on every navigation, yet a replacement shows up quickly. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await params;
  if (!isSlideKind(kind)) return new Response('Not found', { status: 404 });

  const image = await readSlideImage(kind, id);
  if (!image) return new Response('Not found', { status: 404 });

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      'content-type': MIME[image.ext] ?? 'application/octet-stream',
      'cache-control': 'public, max-age=60, stale-while-revalidate=300',
    },
  });
}
