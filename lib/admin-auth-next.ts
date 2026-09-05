import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, getAdminSessionFromCookie } from './admin-auth';

export async function getCurrentAdminSession() {
  const cookieStore = await cookies();
  return getAdminSessionFromCookie(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}
