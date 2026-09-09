/** Shape of the home-page banners and the launch announcement, shared by the
    admin editor and the player-facing components. Pure — no node imports —
    so client components can pull it in. Storage lives in
    site-content-store.ts. */

export const ART_CLASSES = ['s1', 's2', 's3', 's4'] as const;
export type ArtClass = (typeof ART_CLASSES)[number];

export const MAX_SLIDES = 8;

export type SlideStatus = 'active' | 'hidden';

/** A home carousel slide. */
export type Banner = {
  id: string;
  kicker: string;
  title: string;
  amount: string;
  emoji: string;
  cta: string;
  href: string;
  art: ArtClass;
  /** an uploaded picture that replaces the gradient art, served from
      /api/slide-image/banner/<id>; null keeps the drawn slide */
  imageUrl: string | null;
  status: SlideStatus;
  sortOrder: number;
  updatedAt: string;
};

/** A card in the popup shown on first visit. */
export type Announcement = {
  id: string;
  title: string;
  amount: string;
  note: string;
  art: ArtClass;
  /** uploaded picture for the card, served from /api/slide-image/announcement/<id> */
  imageUrl: string | null;
  status: SlideStatus;
  sortOrder: number;
  updatedAt: string;
};

export type SiteContent = {
  banners: Banner[];
  announcements: Announcement[];
};

export type BannerInput = Omit<Banner, 'id' | 'updatedAt' | 'imageUrl'>;
export type AnnouncementInput = Omit<Announcement, 'id' | 'updatedAt' | 'imageUrl'>;

export type ContentMutationReason =
  | 'invalid-title'
  | 'invalid-href'
  | 'list-full'
  | 'not-found'
  | 'invalid-kind'
  | 'no-file'
  | 'bad-type'
  | 'too-large';

export const SLIDE_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const SLIDE_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export type ContentMutationResult =
  | { ok: true; content: SiteContent }
  | { ok: false; reason: ContentMutationReason };

export const ART_LABEL: Record<ArtClass, string> = {
  s1: 'Green',
  s2: 'Purple',
  s3: 'Blue',
  s4: 'Orange',
};

/** What ships before an admin edits anything — the slides the site had
    hard-coded, so the panel opens showing exactly what players see. */
export const DEFAULT_BANNERS: BannerInput[] = [
  { kicker: 'Sign Up Bonus', title: '৳18 Free Bonus', amount: '৳18', emoji: '🎁', cta: 'Claim Now', href: '/register', art: 's1', status: 'active', sortOrder: 1 },
  { kicker: 'Every Deposit', title: '5% Deposit Bonus', amount: '5%', emoji: '💰', cta: 'Deposit Now', href: '/deposit', art: 's2', status: 'active', sortOrder: 2 },
  { kicker: 'Monthly Cashback', title: '1% Rebate Cashback', amount: '1%', emoji: '🏏', cta: 'Details', href: '/promotions', art: 's3', status: 'active', sortOrder: 3 },
  { kicker: 'Refer Programme', title: 'Bring a friend, earn commission', amount: '40%', emoji: '👥', cta: 'Refer Now', href: '/refer', art: 's4', status: 'active', sortOrder: 4 },
];

export const DEFAULT_ANNOUNCEMENTS: AnnouncementInput[] = [
  { title: 'Download the app for a bonus', amount: '৳18', note: 'Sign up and verify your number', art: 's2', status: 'active', sortOrder: 1 },
  { title: 'Bonus on every deposit', amount: '5%', note: 'For life, on every single deposit', art: 's1', status: 'active', sortOrder: 2 },
  { title: 'Monthly rebate cashback', amount: '1%', note: 'Credited automatically each month', art: 's3', status: 'active', sortOrder: 3 },
];

export const activeSorted = <T extends { status: SlideStatus; sortOrder: number }>(list: T[]) =>
  list.filter((s) => s.status === 'active').sort((a, b) => a.sortOrder - b.sortOrder);
