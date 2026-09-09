'use client';

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { browserClient, isBackendReady } from '@/lib/supabase';
import { normalizeAgentCode } from '@/lib/agent-links';
import { emailToPhone, phoneToEmail } from '@/lib/auth';

export interface Profile {
  id: string;
  phone: string;
  display_name: string | null;
  role: 'player' | 'agent' | 'admin';
  vip_level: number;
  referral_code: string;
}

export interface Wallet {
  balance: number;        // paisa
  bonus_balance: number;  // paisa
  turnover_need: number;
  turnover_done: number;
}

interface AuthValue {
  ready: boolean;
  backendReady: boolean;
  session: Session | null;
  profile: Profile | null;
  wallet: Wallet | null;
  supabase: SupabaseClient | null;
  signUp: (
    phone: string,
    password: string,
    referral?: string,
    agentCode?: string,
  ) => Promise<string | null>;
  signIn: (phone: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // one client for the life of the tab; recreating it drops the session listener
  const clientRef = useRef<SupabaseClient | null>(null);
  if (clientRef.current === null) clientRef.current = browserClient();
  const supabase = clientRef.current;

  const [ready, setReady] = useState(!isBackendReady());
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);

  const load = useCallback(async (uid: string | undefined) => {
    if (!supabase || !uid) { setProfile(null); setWallet(null); return; }
    const [p, w] = await Promise.all([
      supabase.from('profiles')
        .select('id, phone, display_name, role, vip_level, referral_code')
        .eq('id', uid).maybeSingle(),
      supabase.from('wallets')
        .select('balance, bonus_balance, turnover_need, turnover_done')
        .eq('user_id', uid).maybeSingle(),
    ]);
    setProfile((p.data as Profile) ?? null);
    setWallet((w.data as Wallet) ?? null);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      await load(data.session?.user.id);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      void load(s?.user.id);
    });

    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [supabase, load]);

  /** Returns an error message, or null on success. */
  const signUp = useCallback<AuthValue['signUp']>(async (phone, password, referral, agentCode) => {
    if (!supabase) return 'The database is not connected';
    // agent_code is read by the signup trigger (migration 008) and written
    // to profiles once. It is metadata rather than a follow-up update so a
    // client that dies right after signUp still leaves the agent credited.
    const { data, error } = await supabase.auth.signUp({
      email: phoneToEmail(phone),
      password,
      options: {
        data: {
          phone,
          referral_code: referral || null,
          agent_code: normalizeAgentCode(agentCode) ?? null,
        },
      },
    });
    if (error) return translate(error.message);
    // the signup trigger seeds profiles.phone from the synthetic email —
    // replace it with the real number now that we are authenticated
    if (data.user) {
      await supabase.from('profiles').update({ phone }).eq('id', data.user.id);
      await load(data.user.id);
    }
    return null;
  }, [supabase, load]);

  const signIn = useCallback<AuthValue['signIn']>(async (phone, password) => {
    if (!supabase) return 'The database is not connected';
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phone), password,
    });
    return error ? translate(error.message) : null;
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setProfile(null);
    setWallet(null);
  }, [supabase]);

  const refresh = useCallback(async () => {
    await load(session?.user.id);
  }, [load, session]);

  const value = useMemo<AuthValue>(() => ({
    ready, backendReady: isBackendReady(), session, profile, wallet, supabase,
    signUp, signIn, signOut, refresh,
  }), [ready, session, profile, wallet, supabase, signUp, signIn, signOut, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Supabase speaks English; players do not. */
function translate(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Wrong number or password';
  if (m.includes('already registered')) return 'An account already exists for this number';
  if (m.includes('password')) return 'The password must be at least 6 characters';
  if (m.includes('email') && m.includes('confirm')) {
    return 'Email confirmation is on — turn it off in the Supabase dashboard';
  }
  if (m.includes('rate limit')) return 'Too many attempts, try again shortly';
  return msg;
}

/** Convenience for the header and member screens. */
export const phoneOf = (session: Session | null) => emailToPhone(session?.user.email);
