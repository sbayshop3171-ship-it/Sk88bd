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
  | 'staff.manage';

/* An agent sits at the cashier: they see who is asking and they answer.
   Nothing they touch changes where money lands. */
const AGENT: AdminPermission[] = ['cashier.review', 'players.read'];

/* An admin runs the day: the cashier, the players, the games, the front
   page. Still not the wallet numbers — see below. */
const ADMIN: AdminPermission[] = [
  ...AGENT,
  'players.write',
  'payments.read',
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
  super_admin: 'সুপার অ্যাডমিন',
  admin: 'অ্যাডমিন',
  agent: 'এজেন্ট',
};

export const ROLE_HELP: Record<AdminRole, string> = {
  super_admin: 'সব কিছু — পেমেন্ট নাম্বার, সেটিংস আর স্টাফ অ্যাকাউন্ট সহ।',
  admin: 'ক্যাশিয়ার, ইউজার, গেম আর সাইটের কনটেন্ট। পেমেন্ট নাম্বার বদলাতে পারবে না।',
  agent: 'শুধু ডিপোজিট-উইথড্র অনুমোদন আর ইউজার দেখা। পেমেন্ট নাম্বার বদলাতে পারবে না।',
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
  { href: '/admin', label: 'ড্যাশবোর্ড' },
  { href: '/admin/deposits', label: 'ডিপোজিট', permission: 'cashier.review' },
  { href: '/admin/withdrawals', label: 'উইথড্র', permission: 'cashier.review' },
  { href: '/admin/users', label: 'ইউজার', permission: 'players.read' },
  { href: '/admin/payments', label: 'পেমেন্ট', permission: 'payments.read' },
  { href: '/admin/cashier', label: 'ক্যাশিয়ার', permission: 'cashier.config' },
  { href: '/admin/games', label: 'গেম', permission: 'games.write' },
  { href: '/admin/aviator-signal', label: 'সিগন্যাল', permission: 'signal.write' },
  { href: '/admin/app-keys', label: 'অ্যাপ কী', permission: 'app-keys.write' },
  { href: '/admin/banners', label: 'ব্যানার', permission: 'content.write' },
  { href: '/admin/staff', label: 'স্টাফ', permission: 'staff.manage' },
  { href: '/admin/settings', label: 'সেটিংস', permission: 'settings.write' },
];

export function tabsFor(role: AdminRole) {
  return ADMIN_TABS.filter((tab) => !tab.permission || can(role, tab.permission));
}

/* ---- the staff list, as a screen sees it ---- */

export type AdminStaff = {
  id: string;
  username: string;
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
  'invalid-username': 'ইউজারনেম ৩-৩২ অক্ষরের হতে হবে — ছোট হাতের অক্ষর, সংখ্যা, . _ -',
  'username-taken': 'এই ইউজারনেম আগে থেকেই আছে।',
  'reserved-username': 'এই ইউজারনেমটি সুপার অ্যাডমিনের — অন্য একটি দিন।',
  'weak-password': 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের দিন।',
  'invalid-role': 'রোলটি চেনা গেল না।',
  'not-found': 'অ্যাকাউন্টটি পাওয়া যায়নি — পেজ রিফ্রেশ করুন।',
  'staff-full': 'সর্বোচ্চ সংখ্যক স্টাফ অ্যাকাউন্ট হয়ে গেছে।',
};

export const MAX_STAFF = 50;
export const MIN_PASSWORD_LENGTH = 8;
