import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Which signal-app build is current, for the app's own updater.
 *
 * { versionCode, versionName, url, notes, force } — read from
 * public/downloads/ariyan-khan.json on every request, which
 * scripts/ship-signal-apk.sh writes next to the APK. Both live only on the
 * server (public/downloads is gitignored). Read from disk rather than served
 * as a static file so a new version shows without a restart, and never
 * cached, so Cloudflare cannot keep offering yesterday's build. The APK url
 * carries ?v=<code> for the same reason: Cloudflare keeps an .apk for hours.
 */
export async function GET() {
  try {
    const file = path.join(process.cwd(), 'public', 'downloads', 'ariyan-khan.json');
    const info = JSON.parse(await readFile(file, 'utf8')) as Record<string, unknown>;
    return NextResponse.json(
      {
        versionCode: Number(info.versionCode) || 0,
        versionName: String(info.versionName ?? ''),
        url: String(info.url ?? ''),
        notes: String(info.notes ?? ''),
        force: info.force === true,
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    // nothing published yet: the app treats 0 as "you are current"
    return NextResponse.json({ versionCode: 0 }, { headers: { 'cache-control': 'no-store' } });
  }
}
