'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

const PAGE = '/change-password';

/** After an admin resets a forgotten password, the player signs in with the
    temporary one the admin gave them. Until they choose their own, every page
    sends them to do that — the temporary password is one the admin knows. */
export default function PasswordResetGate() {
  const { session } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const must = Boolean(session?.mustChangePassword);

  useEffect(() => {
    if (must && path !== PAGE) router.replace(PAGE);
  }, [must, path, router]);

  return null;
}
