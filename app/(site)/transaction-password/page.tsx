'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import PasswordForm from '@/components/PasswordForm';
import { useAuth } from '@/components/AuthProvider';
import { useUI } from '@/components/UIProvider';
import { useLightSheet } from '@/components/useLightSheet';

/** The fund password. It is not the login password: withdrawing asks for this
    one once it exists. The hash lives behind migration 010's SECURITY DEFINER
    functions and never reaches the client. */
export default function TransactionPasswordPage() {
  useLightSheet();
  const router = useRouter();
  const { toast } = useUI();
  const { session, supabase } = useAuth();

  const [has, setHas] = useState<boolean | null>(null);
  useEffect(() => {
    if (!supabase || !session) { setHas(false); return; }
    let live = true;
    void supabase.rpc('has_transaction_password')
      .then(({ data }) => { if (live) setHas(data === true); });
    return () => { live = false; };
  }, [supabase, session]);

  const submit = async (current: string, next: string) => {
    if (!supabase || !session) return 'Log in first';
    /* The first one is proven with the login password (migration 018): a
       session left open on a shared phone must not be able to set a fund
       password and withdraw with it. 'wrong' and 'locked' come back as the
       answer, not an error, so each wrong guess is counted. */
    const { data, error } = await supabase.rpc('set_transaction_password', {
      p_new: next, p_old: current,
    });
    if (error) {
      return /wrong/i.test(error.message)
        ? 'Your current password is wrong'
        : 'Could not save it — try again';
    }
    if (data === 'locked') return 'Too many wrong passwords — try again in 15 minutes';
    if (data === 'wrong') return has ? 'Your current password is wrong' : 'Your login password is wrong';
    toast(has ? 'Transaction password changed' : 'Transaction password set');
    router.push('/security');
    return null;
  };

  return (
    <>
      <PageHeader title="Transaction Password" />
      <div className="msheet ms--txn">
        {has !== null && (
          <PasswordForm
            min={6} max={16} submit={submit}
            currentPlaceholder={has ? 'Enter your current password.' : 'Enter your login password.'}
          />
        )}
      </div>
    </>
  );
}
