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
  s1: 'সবুজ',
  s2: 'বেগুনি',
  s3: 'নীল',
  s4: 'কমলা',
};

/** What ships before an admin edits anything — the slides the site had
    hard-coded, so the panel opens showing exactly what players see. */
export const DEFAULT_BANNERS: BannerInput[] = [
  { kicker: 'সাইন আপ বোনাস', title: '১৮৳ ফ্রি বোনাস', amount: '৳১৮', emoji: '🎁', cta: 'এখনই নিন', href: '/register', art: 's1', status: 'active', sortOrder: 1 },
  { kicker: 'প্রতিবার ডিপোজিট', title: '৫% ডিপোজিট বোনাস', amount: '৫%', emoji: '💰', cta: 'ডিপোজিট করুন', href: '/deposit', art: 's2', status: 'active', sortOrder: 2 },
  { kicker: 'মাসিক ক্যাশব্যাক', title: '১% রিবেট ক্যাশব্যাক', amount: '১%', emoji: '🏏', cta: 'বিস্তারিত', href: '/promotions', art: 's3', status: 'active', sortOrder: 3 },
  { kicker: 'রেফার প্রোগ্রাম', title: 'বন্ধু আনুন, কমিশন নিন', amount: '৪০%', emoji: '👥', cta: 'রেফার করুন', href: '/refer', art: 's4', status: 'active', sortOrder: 4 },
];

export const DEFAULT_ANNOUNCEMENTS: AnnouncementInput[] = [
  { title: 'অ্যাপ ডাউনলোড করলেই বোনাস', amount: '৳১৮', note: 'সাইন আপ করে নাম্বার ভেরিফাই করুন', art: 's2', status: 'active', sortOrder: 1 },
  { title: 'প্রতিবার ডিপোজিট বোনাস', amount: '৫%', note: 'আজীবন, প্রতিটি ডিপোজিটে', art: 's1', status: 'active', sortOrder: 2 },
  { title: 'মাসিক রিবেট ক্যাশব্যাক', amount: '১%', note: 'প্রতি মাসে অটোমেটিক জমা', art: 's3', status: 'active', sortOrder: 3 },
];

export const activeSorted = <T extends { status: SlideStatus; sortOrder: number }>(list: T[]) =>
  list.filter((s) => s.status === 'active').sort((a, b) => a.sortOrder - b.sortOrder);
