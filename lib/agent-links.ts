/** An agent's invite code, and the link that carries it.

    Kept free of node: imports on purpose — the staff screen, the agent
    screen and the register page are all client components, and they need to
    build and validate the same link the server does.

    The alphabet drops I, O, 0 and 1. An agent reads their code off a phone
    screen to somebody in a shop; the pairs that look alike cost more in
    mistyped links than the extra entropy is worth. */

export const AGENT_CODE_LENGTH = 6;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const AGENT_CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;

/** The query parameter an invite link carries. Deliberately not `ref`:
    that one is a player's own referral code and resolves against
    profiles.referral_code, so sharing one namespace between the two would
    make a collision credit the wrong side. */
export const AGENT_PARAM = 'agent';

/** Upper-cased and trimmed, or null when it is not a code at all. Anything
    arriving from a URL goes through this before it is stored or queried. */
export function normalizeAgentCode(value: unknown): string | null {
  const code = String(value ?? '').trim().toUpperCase();
  return AGENT_CODE_RE.test(code) ? code : null;
}

/** A fresh code. Callers check it against the ones already handed out —
    32^6 is roomy, but "roomy" is not "unique". */
export function generateAgentCode(): string {
  const bytes = new Uint8Array(AGENT_CODE_LENGTH);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** The link an agent shares. `origin` is whatever the panel is being read
    from, so a code copied on localhost points at localhost and one copied
    on the live domain points at the live domain — no hard-coded host to go
    stale when the domain changes. */
export function agentInviteLink(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, '')}/register?${AGENT_PARAM}=${encodeURIComponent(code)}`;
}
