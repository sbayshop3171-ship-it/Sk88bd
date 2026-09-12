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
  /** approve or reject deposit requests */
  | 'deposits.review'
  /** approve, reject or lock withdrawal requests */
  | 'withdrawals.review'
  /** the deposit/withdraw flow itself: steps, charges, channels */
  | 'cashier.config'
  | 'players.read'
  /** lock a player's withdrawals and answer their appeal (an agent: their
      own players only) */
  | 'players.lock'
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
   Nothing they touch changes where money lands. They may lock one of their
   own players' withdrawals, which moves nothing — the operator's call,
   2026-09-11. */
const AGENT: AdminPermission[] = [
  'deposits.review',
  'withdrawals.review',
  'players.read',
  'players.lock',
  'agents.self',
];

/* An admin runs the day: the cashier, the players, the games, the front
   page — and, since 2026-09-10, the wallet numbers a deposit lands in. That
   last one was the super admin's alone until the operator asked for it here;
   it is still kept from agents, who see the cashier but never decide where
   the money goes. */
const ADMIN: AdminPermission[] = [
  ...AGENT,
  'players.write',
  'payments.read',
  'payments.write',
  'agents.read',
  'cashier.config',
  'games.write',
  'content.write',
  'signal.write',
];

/* The super admin is the operator. The app keys, the site settings and the
   staff list itself stop here — an admin who could create staff could make
   themselves a super admin, and one who could rewrite the settings could
   point the site somewhere else. */
const SUPER_ADMIN: AdminPermission[] = [
  ...ADMIN,
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
  admin: 'By default: cashier, payment numbers, users, games and site content. The super admin can tick more or fewer.',
  agent: 'By default: deposit/withdraw approvals, their own players and their own link. The super admin can tick more or fewer.',
};

/** What a super admin may hand out. The super admin login itself comes from
    the server environment, so it is never created or deleted from a screen —
    losing the last one would lock everybody out of their own panel. */
export const ASSIGNABLE_ROLES: AdminRole[] = ['admin', 'agent'];

export function isAdminRole(value: unknown): value is AdminRole {
  return value === 'super_admin' || value === 'admin' || value === 'agent';
}

/* ---- per-account permissions ----
   A role is only the starting point. Since 2026-09-12 the super admin can
   tick exactly which screens each admin or agent gets — one agent on
   deposits only, another on withdrawals, an admin who may change banners
   but never a payment number. An account with no list of its own keeps its
   role's defaults, which is every account created before this. */

export const ALL_PERMISSIONS: readonly AdminPermission[] = SUPER_ADMIN;

/** What the super admin may hand out. 'staff.manage' is not on it: whoever
    holds it could tick every box on their own row and become a second super
    admin, so staff accounts stay with the operator alone. */
export const GRANTABLE_PERMISSIONS: readonly AdminPermission[] = ALL_PERMISSIONS.filter(
  (p) => p !== 'staff.manage',
);

export const PERMISSION_GROUPS: { title: string; items: { key: AdminPermission; label: string; help: string }[] }[] = [
  {
    title: 'Cashier',
    items: [
      { key: 'deposits.review', label: 'Deposits', help: 'Approve or reject deposit requests' },
      { key: 'withdrawals.review', label: 'Withdrawals', help: 'Approve or reject withdrawal requests' },
      { key: 'cashier.config', label: 'Cashier & bonus setup', help: 'Deposit/withdraw steps, charges, channels and bonus rules' },
    ],
  },
  {
    title: 'Payment numbers',
    items: [
      { key: 'payments.read', label: 'See payment numbers', help: 'View the wallet numbers deposits land in' },
      { key: 'payments.write', label: 'Change payment numbers', help: 'Add, edit, turn off or delete a number' },
    ],
  },
  {
    title: 'Players',
    items: [
      { key: 'players.read', label: 'View players', help: 'The player list and their details' },
      { key: 'players.lock', label: 'Lock withdrawals', help: "Lock a player's withdrawals and answer their appeal" },
      { key: 'players.write', label: 'Balance, hold & ban', help: 'Adjust balances, hold or ban a player' },
    ],
  },
  {
    title: 'Agents',
    items: [
      { key: 'agents.self', label: 'Own invite link', help: 'Their own link and the players who joined through it' },
      { key: 'agents.read', label: 'All agents & all players', help: "Every agent's link and every player — without it they see only their own players" },
    ],
  },
  {
    title: 'Site',
    items: [
      { key: 'content.write', label: 'Banners', help: 'Home banners, announcements and marquee cards' },
      { key: 'games.write', label: 'Games', help: 'Show, hide and edit games' },
      { key: 'signal.write', label: 'Signal', help: 'The Aviator signal control' },
      { key: 'settings.write', label: 'Settings', help: 'Site settings — contact links, site name and the like' },
      { key: 'app-keys.write', label: 'App keys', help: 'Keys for the signal app' },
    ],
  },
];

export function isAdminPermission(value: unknown): value is AdminPermission {
  return typeof value === 'string' && (ALL_PERMISSIONS as readonly string[]).includes(value);
}

/** A ticked list made safe: unknown names and 'staff.manage' dropped, and
    the read a write needs added — a "change payment numbers" box without
    "see payment numbers" would open a screen that refuses them. */
export function cleanPermissions(input: unknown): AdminPermission[] {
  const picked = new Set(
    (Array.isArray(input) ? input : []).filter(
      (p): p is AdminPermission => isAdminPermission(p) && GRANTABLE_PERMISSIONS.includes(p),
    ),
  );
  if (picked.has('payments.write')) picked.add('payments.read');
  if (picked.has('players.write') || picked.has('players.lock')) picked.add('players.read');
  return GRANTABLE_PERMISSIONS.filter((p) => picked.has(p));
}

/** What an account may actually do: its own ticked list, else its role's. */
export function permissionsFor(role: AdminRole, custom?: readonly AdminPermission[] | null): AdminPermission[] {
  if (role === 'super_admin') return [...SUPER_ADMIN];
  return custom ? cleanPermissions(custom) : [...ROLE_PERMISSIONS[role]];
}

/** Anything that carries a resolved permission list — a session, usually. */
export type PermissionHolder = { permissions: readonly AdminPermission[] };

export function can(who: PermissionHolder, permission: AdminPermission): boolean {
  return who.permissions.includes(permission);
}

/** The admin tabs, each with the permission that earns it. The nav filters
    with this and every page behind a tab checks the same permission again —
    a hidden link is a courtesy, the check on the page is the lock. */
export const ADMIN_TABS: { href: string; label: string; permission?: AdminPermission }[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/deposits', label: 'Deposits', permission: 'deposits.review' },
  { href: '/admin/withdrawals', label: 'Withdrawals', permission: 'withdrawals.review' },
  { href: '/admin/users', label: 'Users', permission: 'players.read' },
  { href: '/admin/agents', label: 'Agents', permission: 'agents.self' },
  { href: '/admin/payments', label: 'Payments', permission: 'payments.read' },
  { href: '/admin/cashier', label: 'Cashier', permission: 'cashier.config' },
  { href: '/admin/bonus', label: 'Bonuses', permission: 'cashier.config' },
  { href: '/admin/games', label: 'Games', permission: 'games.write' },
  { href: '/admin/aviator-signal', label: 'Signal', permission: 'signal.write' },
  { href: '/admin/app-keys', label: 'App Keys', permission: 'app-keys.write' },
  { href: '/admin/banners', label: 'Banners', permission: 'content.write' },
  { href: '/admin/staff', label: 'Staff', permission: 'staff.manage' },
  { href: '/admin/settings', label: 'Settings', permission: 'settings.write' },
];

export function tabsFor(who: PermissionHolder) {
  return ADMIN_TABS.filter((tab) => !tab.permission || can(who, tab.permission));
}

/* ---- the staff list, as a screen sees it ---- */

export type AdminStaff = {
  id: string;
  username: string;
  /** the code in this account's invite link — see lib/agent-links.ts */
  refCode: string;
  role: AdminRole;
  /** the boxes the super admin ticked; absent = the role's defaults */
  permissions?: AdminPermission[];
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
  | 'invalid-permissions'
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
  'invalid-permissions': 'That permission list was not recognised.',
  'not-found': 'Account not found — refresh the page.',
  'staff-full': 'The staff account limit has been reached.',
};

export const MAX_STAFF = 50;
export const MIN_PASSWORD_LENGTH = 8;
