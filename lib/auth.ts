/* ============================================================
   Account identity.

   Players sign in with a Bangladeshi mobile number. Supabase phone auth
   needs a paid SMS provider for the OTP step, which this project does not
   have yet, so the number is mapped to a deterministic internal email and
   Supabase's email+password flow does the work. The player never sees it.

   When an SMS provider is bought, `signUp`/`signIn` switch to { phone },
   the stored `profiles.phone` is already correct, and nothing else moves.
   ============================================================ */

/**
 * Domain for the synthetic address. A subdomain of the brand domain, so it is
 * a valid address (Supabase rejects reserved TLDs like .local) while never
 * colliding with a real mailbox at the apex. No mail is ever sent to it —
 * email confirmation must stay off in Supabase Auth settings.
 */
const IDENTITY_DOMAIN = 'id.sk88bd.live';

export const BD_PHONE = /^01\d{9}$/;

export const isValidPhone = (phone: string) => BD_PHONE.test(phone.trim());

/** 01712345678 → 01712345678@sk88bd.local */
export function phoneToEmail(phone: string): string {
  const p = phone.trim();
  if (!isValidPhone(p)) throw new Error('invalid phone');
  return `${p}@${IDENTITY_DOMAIN}`;
}

/** Best-effort inverse, for showing the number on a profile screen. */
export function emailToPhone(email: string | null | undefined): string | null {
  if (!email) return null;
  const [local, domain] = email.split('@');
  return domain === IDENTITY_DOMAIN && isValidPhone(local) ? local : null;
}

/** ৳ amounts live in the database as paisa so nothing is ever a float. */
export const toPaisa = (taka: number) => Math.round(taka * 100);
export const toTaka = (paisa: number) => paisa / 100;
