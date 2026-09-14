'use client';

import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import PasswordForm from '@/components/PasswordForm';
import { useAuth } from '@/components/AuthProvider';
import { useUI } from '@/components/UIProvider';
import { useLightSheet } from '@/components/useLightSheet';

/** The login password, changed from the Security Center. Supabase Auth does
    the change and the session it hands back stays valid, so the player is not
    logged out afterwards — but the old password is checked first, because a
    session left open on a shared phone should not be able to lock the owner
    out of their own account.

    After an admin reset (session.mustChangePassword) every page sends the
    player here, and the current password is not asked: they have only just
    signed in with the temporary one. */
export default function ChangePasswordPage() {
  useLightSheet();
  const router = useRouter();
  const { toast } = useUI();
  const { session, supabase } = useAuth();
  const forced = Boolean(session?.mustChangePassword);

  const submit = async (current: string, next: string) => {
    if (!supabase || !session) return 'Log in first';

    if (!forced) {
      const check = await supabase.auth.signInWithPassword({
        email: session.user.email ?? '', password: current,
      });
      if (check.error) return 'Your current password is wrong';
    }

    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) {
      return /same|different/i.test(error.message)
        ? 'The new password must be different from the old one'
        : 'Could not change the password — try again';
    }
    toast('Password changed');
    router.push(forced ? '/' : '/security');
    return null;
  };

  return (
    <>
      <PageHeader title={forced ? 'Set a new login password' : 'Change login password'} />
      <div className="msheet">
        {forced && (
          <p className="ms-pad ms-note">
            Your password was reset by support. Choose your own password to continue.
          </p>
        )}
        <PasswordForm min={6} max={12} askCurrent={!forced} submit={submit} />
      </div>
    </>
  );
}
