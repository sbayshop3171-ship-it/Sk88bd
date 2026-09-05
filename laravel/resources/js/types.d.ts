export interface Profile {
    id: number;
    phone: string;
    display_name: string | null;
    role: 'player' | 'agent' | 'admin';
    vip_level: number;
    referral_code: string;
    created_at: string | null;
}

/** All amounts are paisa: 1234 renders as ৳12.34. */
export interface Wallet {
    balance: number;
    bonus_balance: number;
    turnover_need: number;
    turnover_done: number;
}

export interface Game {
    id: number;
    slug: string;
    name: string;
    glyph: string | null;
    provider: string;
    category: CategoryKey;
    thumb_url: string | null;
    /** provider fun-mode launch URL; null means no provider is connected */
    demo_url: string | null;
    tag: 'hot' | 'new' | 'top' | null;
    is_playable: boolean;
    is_active: boolean;
    sort_order: number;
}

export type CategoryKey =
    | 'hot' | 'sports' | 'live' | 'slot'
    | 'poker' | 'fish' | 'esports' | 'lottery';

export interface Channel {
    id: string;
    name: string;
    glyph: string | null;
    art: string | null;
    min_amount: number;
    max_amount: number;
    /** Operator's receiving account. Only ever sent to the deposit screen. */
    account_no?: string | null;
    account_name?: string | null;
}

export interface Banner {
    id: number;
    title: string;
    subtitle: string | null;
    kicker: string | null;
    amount: string | null;
    emoji: string | null;
    cta: string | null;
    art: string | null;
    image_url: string | null;
    href: string | null;
}

export interface Promo {
    id: string;
    title: string;
    body: string;
    glyph: string | null;
    art: string | null;
    badge: string | null;
}

export interface VipTier {
    level: string;
    need: number;
    rebate: string;
    gift: string;
}

/** Laravel's length-aware paginator, as Inertia serialises it. */
export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

export interface SharedProps {
    auth: {
        user: Profile | null;
        wallet: Wallet | null;
    };
    flash: {
        toast: string | null;
    };
    [key: string]: unknown;
}

declare module '@inertiajs/core' {
    interface PageProps extends SharedProps {}
}
