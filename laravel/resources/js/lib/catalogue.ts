import type { CategoryKey } from '../types';

/** Tabs in the sticky rail. Mirrors App\Support\Catalogue::TAB_ORDER. */
export const TAB_ORDER: CategoryKey[] = ['hot', 'sports', 'live', 'slot', 'poker', 'fish'];

/** Every section on the home page and in the lobby, top to bottom. */
export const HOME_SECTIONS: CategoryKey[] = [
    'hot', 'sports', 'live', 'slot', 'poker', 'fish', 'esports', 'lottery',
];

export const CATEGORY_GLYPH: Record<CategoryKey, string> = {
    hot: '🔥', sports: '🏏', live: '🎲', slot: '🎰',
    poker: '🃏', fish: '🐟', esports: '🎮', lottery: '🎟️',
};

export const PAYMENT_METHODS = ['bKash', 'Nagad', 'Rocket', 'Upay', 'Bank Transfer', 'USDT'];
