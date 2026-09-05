'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AdminLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn btn--ghost adm__logout" type="button" onClick={logout} disabled={busy}>
      {busy ? '...' : 'লগআউট'}
    </button>
  );
}
