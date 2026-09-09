/** Who may do what inside /admin.

    Kept apart from admin-auth.ts because that one reads and writes .data/
    through node:fs — the nav and the staff screen are client components and
    need the role names and the tab list without dragging the server module
    into the browser bundle.

    The panel used to have exactly one account, from the environment, and
    every route asked the same question: is somebody signed in? That answer
    let whoever was holding the password repoint the payment numbers. With
    staff logins that question is no longer enough, so each route asks for a
    named permission instead. */

export type AdminRole = 'super_admin' | 'admin' | 'agent';

export type AdminPermission =
  /** approve or reject deposits and withdrawals */
  | 'cashier.review'
  /** the deposit/withdraw flow itself: steps, charges, channels */
  | 'cashier.config'
  | 'players.read'
  /** balance adjustments, block/unblock */
  | 'players.write'
  /** see the operator wallet numbers */
  | 'payments.read'
  /** add, edit, disable or delete an operator wallet number */
  | 'payments.write'
  | 'games.write'
  /** banners, announcements, marquee cards */
  | 'content.write'
  | 'settings.write'
  | 'signal.write'
  | 'app-keys.write'
  /** create staff logins and set their roles */
  | 'staff.manage'
  /** one's own invite link and the players who signed up through it */
  | 'agents.self'
  /** every agent's link, their player counts, and whose player is whose */
  | 'agents.read';

/* An agent sits at the cashier: they see who is asking and they answer.
   Nothing they touch changes where money lands. */
const AGENT: AdminPermission[] = ['cashier.review', 'players.read', 'agents.self'];

/* An admin runs the day: the cashier, the players, the games, the front
   page. Still not the wallet numbers — see below. */
const ADMIN: AdminPermission[] = [
  ...AGENT,
  'players.write',
  'payments.read',
  'agents.read',
  'cashier.config',
  'games.write',
  'content.write',
  'signal.write',
];

/* The super admin is the operator. The payment numbers are the one thing
   that decides whose bKash a player's deposit lands in, so writing them
   stops here — as do the app keys, the site settings, and the staff list
   itself. Moving 'payments.write' up to ADMIN is a one-line change if the
   operator later wants their admins editing numbers too. */
const SUPER_ADMIN: AdminPermission[] = [
  ...ADMIN,
  'payments.write',
  'settings.write',
  'app-keys.write',
  'staff.manage',
];

export const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  agent: AGENT,
  admin: ADMIN,
  super_admin: SUPER_ADMIN,
};

export const ROLE_LABEL: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  agent: 'Agent',
};

export const ROLE_HELP: Record<AdminRole, string> = {
  super_admin: 'Everything — payment numbers, settings and staff accounts included.',
  admin: 'Cashier, users, games and site content. Cannot change payment numbers.',
  agent: 'Only deposit/withdraw approvals, viewing users and their own referral link. Cannot change payment numbers.',
};

/** What a super admin may hand out. The super admin login itself comes from
    the server environment, so it is never created or deleted from a screen —
    losing the last one would lock everybody out of their own panel. */
export const ASSIGNABLE_ROLES: AdminRole[] = ['admin', 'agent'];

export function isAdminRole(value: unknown): value is AdminRole {
  return value === 'super_admin' || value === 'admin' || value === 'agent';
}

export function can(role: AdminRole, permission: AdminPermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** The admin tabs, each with the permission that earns it. The nav filters
    with this and every page behind a tab checks the same permission again —
    a hidden link is a courtesy, the check on the page is the lock. */
export const ADMIN_TABS: { href: string; label: string; permission?: AdminPermission }[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/deposits', label: 'Deposits', permission: 'cashier.review' },
  { href: '/admin/withdrawals', label: 'Withdrawals', permission: 'cashier.review' },
  { href: '/admin/users', label: 'Users', permission: 'players.read' },
  { href: '/admin/agents', label: 'Agents', permission: 'agents.self' },
  { href: '/admin/payments', label: 'Payments', permission: 'payments.read' },
  { href: '/admin/cashier', label: 'Cashier', permission: 'cashier.config' },
  { href: '/admin/games', label: 'Games', permission: 'games.write' },
  { href: '/admin/aviator-signal', label: 'Signal', permission: 'signal.write' },
  { href: '/admin/app-keys', label: 'App Keys', permission: 'app-keys.write' },
  { href: '/admin/banners', label: 'Banners', permission: 'content.write' },
  { href: '/admin/staff', label: 'Staff', permission: 'staff.manage' },
  { href: '/admin/settings', label: 'Settings', permission: 'settings.write' },
];

export function tabsFor(role: AdminRole) {
  return ADMIN_TABS.filter((tab) => !tab.permission || can(role, tab.permission));
}

/* ---- the staff list, as a screen sees it ---- */

export type AdminStaff = {
  id: string;
  username: string;
  /** the code in this account's invite link — see lib/agent-links.ts */
  refCode: string;
  role: AdminRole;
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

export type StaffMutationReason =
  | 'invalid-username'
  | 'username-taken'
  | 'reserved-username'
  | 'weak-password'
  | 'invalid-role'
  | 'not-found'
  | 'staff-full';

export type StaffMutationResult =
  | { ok: true; staff: AdminStaff[] }
  | { ok: false; reason: StaffMutationReason };

export const STAFF_ERROR_LABEL: Record<StaffMutationReason, string> = {
  'invalid-username': 'Username must be 3-32 characters — lowercase letters, digits, . _ -',
  'username-taken': 'That username is already taken.',
  'reserved-username': 'That username belongs to the super admin — pick another.',
  'weak-password': 'Use a password of at least 8 characters.',
  'invalid-role': 'That role was not recognised.',
  'not-found': 'Account not found — refresh the page.',
  'staff-full': 'The staff account limit has been reached.',
};

export const MAX_STAFF = 50;
export const MIN_PASSWORD_LENGTH = 8;
