/** Home banners + the first-visit announcement, edited from /admin/banners.

    Seeded on first read with the slides the site used to hard-code, so the
    admin panel opens showing exactly what players already see and every edit
    is a change to something real. Same .data/ file-store shape as the signal
    and app-key stores. */

import { randomBytes } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  ART_CLASSES,
  DEFAULT_ANNOUNCEMENTS,
  DEFAULT_BANNERS,
  MAX_SLIDES,
  type Announcement,
  type AnnouncementInput,
  type ArtClass,
  type Banner,
  type BannerInput,
  type ContentMutationReason,
  type ContentMutationResult,
  type SiteContent,
  type SlideStatus,
} from './site-content';
import { englishCopy } from './copy-migration';

type ContentStore = {
  version: 1;
  banners: Banner[];
  announcements: Announcement[];
  updatedAt: string;
};

export type SlideKind = 'banner' | 'announcement';

const STORE_FILE = path.join(process.cwd(), '.data', 'site-content-store.json');
const IMAGE_DIR = path.join(process.cwd(), '.data', 'slide-images');

let writeQueue = Promise.resolve();

export async function getSiteContent(): Promise<SiteContent> {
  const store = await readStore();
  return { banners: sorted(store.banners), announcements: sorted(store.announcements) };
}

export async function addSlide(
  kind: SlideKind,
  input: Partial<BannerInput & AnnouncementInput>,
): Promise<ContentMutationResult> {
  const clean = normalize(kind, input);
  if ('reason' in clean) return { ok: false, reason: clean.reason };

  return mutateStore((store) => {
    const list = listOf(store, kind);
    if (list.length >= MAX_SLIDES) return { ok: false, reason: 'list-full' as const };

    const now = iso(Date.now());
    list.push({ id: randomBytes(6).toString('hex'), ...clean, imageUrl: null, updatedAt: now } as Banner & Announcement);
    store.updatedAt = now;
    return { ok: true, content: content(store) };
  });
}

export async function updateSlide(
  kind: SlideKind,
  id: string,
  patch: Partial<BannerInput & AnnouncementInput>,
): Promise<ContentMutationResult> {
  return mutateStore((store) => {
    const slide = listOf(store, kind).find((s) => s.id === id);
    if (!slide) return { ok: false, reason: 'not-found' as const };

    const clean = normalize(kind, { ...slide, ...patch });
    if ('reason' in clean) return { ok: false, reason: clean.reason };

    Object.assign(slide, clean, { updatedAt: iso(Date.now()) });
    store.updatedAt = slide.updatedAt;
    return { ok: true, content: content(store) };
  });
}

export async function removeSlide(kind: SlideKind, id: string): Promise<ContentMutationResult> {
  return mutateStore((store) => {
    const list = listOf(store, kind);
    const at = list.findIndex((s) => s.id === id);
    if (at < 0) return { ok: false, reason: 'not-found' as const };

    list.splice(at, 1);
    store.updatedAt = iso(Date.now());
    return { ok: true, content: content(store) };
  });
}

export function isSlideKind(value: unknown): value is SlideKind {
  return value === 'banner' || value === 'announcement';
}

/**
 * Save an uploaded picture for a slide and point the slide at it. Files live
 * in .data/slide-images/ on the same persistent disk as the store; the route
 * at /api/slide-image/<kind>/<id> serves them back.
 */
export async function saveSlideImage(
  kind: SlideKind,
  id: string,
  ext: string,
  bytes: Buffer,
): Promise<ContentMutationResult> {
  await mkdir(IMAGE_DIR, { recursive: true });
  await removeImageFiles(kind, id);
  await writeFile(path.join(IMAGE_DIR, `${kind}-${id}.${ext}`), bytes);

  return mutateStore((store) => {
    const slide = listOf(store, kind).find((s) => s.id === id);
    if (!slide) return { ok: false, reason: 'not-found' as const };
    slide.imageUrl = `/api/slide-image/${kind}/${id}`;
    slide.updatedAt = iso(Date.now());
    store.updatedAt = slide.updatedAt;
    return { ok: true, content: content(store) };
  });
}

/** Drop the picture so the slide falls back to its drawn art. */
export async function clearSlideImage(kind: SlideKind, id: string): Promise<ContentMutationResult> {
  await removeImageFiles(kind, id);
  return mutateStore((store) => {
    const slide = listOf(store, kind).find((s) => s.id === id);
    if (!slide) return { ok: false, reason: 'not-found' as const };
    slide.imageUrl = null;
    slide.updatedAt = iso(Date.now());
    store.updatedAt = slide.updatedAt;
    return { ok: true, content: content(store) };
  });
}

/** The stored picture, or null when the slide has none. */
export async function readSlideImage(
  kind: SlideKind,
  id: string,
): Promise<{ bytes: Buffer; ext: string } | null> {
  if (!/^[a-f0-9]{12}$/.test(id)) return null;
  for (const ext of ['png', 'jpg', 'webp', 'gif']) {
    try {
      return { bytes: await readFile(path.join(IMAGE_DIR, `${kind}-${id}.${ext}`)), ext };
    } catch {
      // try the next extension
    }
  }
  return null;
}

async function removeImageFiles(kind: SlideKind, id: string) {
  try {
    const files = await readdir(IMAGE_DIR);
    await Promise.all(
      files
        .filter((f) => f.replace(/\.[^.]+$/, '') === `${kind}-${id}`)
        .map((f) => rm(path.join(IMAGE_DIR, f), { force: true })),
    );
  } catch {
    // no image directory yet
  }
}

function content(store: ContentStore): SiteContent {
  return { banners: sorted(store.banners), announcements: sorted(store.announcements) };
}

function listOf(store: ContentStore, kind: SlideKind) {
  return (kind === 'banner' ? store.banners : store.announcements) as (Banner & Announcement)[];
}

function normalize(
  kind: SlideKind,
  input: Partial<BannerInput & AnnouncementInput>,
): (BannerInput & Partial<AnnouncementInput>) | { reason: ContentMutationReason } {
  const title = String(input.title ?? '').trim().slice(0, 80);
  if (title.length < 2) return { reason: 'invalid-title' };

  // Only in-site paths: an external href in a slide would be an open redirect
  // sitting on the home page.
  const href = String(input.href ?? '/').trim();
  if (kind === 'banner' && !/^\/[\w\-/[\]]*$/.test(href)) return { reason: 'invalid-href' };

  return {
    kicker: String(input.kicker ?? '').trim().slice(0, 40),
    title,
    amount: String(input.amount ?? '').trim().slice(0, 16),
    emoji: String(input.emoji ?? '🎁').trim().slice(0, 8),
    cta: String(input.cta ?? 'Details').trim().slice(0, 24),
    href,
    note: String(input.note ?? '').trim().slice(0, 90),
    art: ART_CLASSES.includes(input.art as ArtClass) ? (input.art as ArtClass) : 's1',
    status: (input.status === 'hidden' ? 'hidden' : 'active') as SlideStatus,
    sortOrder: clampOrder(input.sortOrder),
  };
}

function clampOrder(value: unknown) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 1;
  return Math.min(99, Math.max(1, n));
}

const sorted = <T extends { sortOrder: number }>(list: T[]) =>
  [...list].sort((a, b) => a.sortOrder - b.sortOrder);

function mutateStore<T>(fn: (store: ContentStore) => T): Promise<T> {
  const next = writeQueue.then(async () => {
    const store = await readStore();
    const result = fn(store);
    await writeStore(store);
    return result;
  });
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

async function readStore(): Promise<ContentStore> {
  try {
    const raw = await readFile(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as ContentStore;
    // Slides saved before the site went English still carry the Bangla
    // defaults — see lib/copy-migration.ts.
    if (parsed?.version === 1 && Array.isArray(parsed.banners)) return englishCopy(parsed);
  } catch {
    // First run: seed from what the site already shows.
  }
  return createInitialStore();
}

function createInitialStore(): ContentStore {
  const now = iso(Date.now());
  return {
    version: 1,
    banners: DEFAULT_BANNERS.map((b) => ({ ...b, id: randomBytes(6).toString('hex'), imageUrl: null, updatedAt: now })),
    announcements: DEFAULT_ANNOUNCEMENTS.map((a) => ({ ...a, id: randomBytes(6).toString('hex'), imageUrl: null, updatedAt: now })),
    updatedAt: now,
  };
}

async function writeStore(store: ContentStore) {
  await mkdir(path.dirname(STORE_FILE), { recursive: true });
  await writeFile(STORE_FILE, `${JSON.stringify(store, null, 2)}\n`);
}

function iso(ms: number) {
  return new Date(ms).toISOString();
}
