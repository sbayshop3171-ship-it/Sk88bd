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
    out of their own account. */
export default function ChangePasswordPage() {
  useLightSheet();
  const router = useRouter();
  const { toast } = useUI();
  const { session, supabase } = useAuth();

  const submit = async (current: string, next: string) => {
    if (!supabase || !session) return 'Log in first';

    const check = await supabase.auth.signInWithPassword({
      email: session.user.email ?? '', password: current,
    });
    if (check.error) return 'Your current password is wrong';

    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) {
      return /same|different/i.test(error.message)
        ? 'The new password must be different from the old one'
        : 'Could not change the password — try again';
    }
    toast('Password changed');
    router.push('/security');
    return null;
  };

  return (
    <>
      <PageHeader title="Change login password" />
      <div className="msheet">
        <PasswordForm min={6} max={12} submit={submit} />
      </div>
    </>
  );
}
