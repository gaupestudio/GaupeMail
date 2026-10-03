import { randomBytes } from 'node:crypto';
import type { H3Event } from 'h3';
import type { User } from '../generated/prisma/client';

const COOKIE = 'gm_session';
const SESSION_DAYS = 30;

export async function createSession(event: H3Event, userId: number) {
  const id = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await prisma.session.create({ data: { id, userId, expiresAt } });
  setCookie(event, COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.dev,
    path: '/',
    expires: expiresAt,
  });
}

export async function destroySession(event: H3Event) {
  const id = getCookie(event, COOKIE);
  if (id) await prisma.session.deleteMany({ where: { id } });
  deleteCookie(event, COOKIE, { path: '/' });
}

export async function getSessionUser(event: H3Event): Promise<User | null> {
  const id = getCookie(event, COOKIE);
  if (!id) return null;
  const session = await prisma.session.findUnique({ where: { id }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id } }).catch(() => {});
    return null;
  }
  return session.user;
}

export async function requireUser(event: H3Event): Promise<User> {
  const user = await getSessionUser(event);
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Not signed in' });
  return user;
}

export async function requireAdmin(event: H3Event): Promise<User> {
  const user = await requireUser(event);
  if (!user.isAdmin) throw createError({ statusCode: 403, statusMessage: 'Admin only' });
  return user;
}

/** True until the first user exists — first run creates the initial admin. */
export async function isFirstRun(): Promise<boolean> {
  return (await prisma.user.count()) === 0;
}

// --- short-lived WebAuthn challenge, stored in a cookie ---
const CHALLENGE = 'gm_challenge';

export function stashChallenge(event: H3Event, challenge: string) {
  setCookie(event, CHALLENGE, challenge, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.dev,
    path: '/',
    maxAge: 300,
  });
}

export function popChallenge(event: H3Event): string {
  const c = getCookie(event, CHALLENGE);
  deleteCookie(event, CHALLENGE, { path: '/' });
  if (!c) throw createError({ statusCode: 400, statusMessage: 'Challenge expired' });
  return c;
}
