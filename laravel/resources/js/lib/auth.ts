import { usePage } from '@inertiajs/react';
import type { Profile, Wallet } from '../types';

/**
 * The signed-in player, from Inertia's shared props.
 *
 * Replaces the old Supabase AuthProvider: the session is resolved on the
 * server before the page renders, so there is no "not ready yet" state and
 * the header never flips between guest and member after paint.
 */
export function useAuth(): { user: Profile | null; wallet: Wallet | null; signedIn: boolean } {
    const { auth } = usePage().props;

    return {
        user: auth.user,
        wallet: auth.wallet,
        signedIn: auth.user !== null,
    };
}
