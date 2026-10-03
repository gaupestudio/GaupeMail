import { generateRegistrationOptions } from '@simplewebauthn/server';

// Passkey registration is allowed when:
//  - first run (no users yet)      -> creates the initial admin on verify
//  - the named user has no passkey  -> first-passkey self-enrollment
//  - you are already signed in      -> adding another passkey to yourself
export default defineEventHandler(async (event) => {
  const { rpID, rpName } = waConfig(event);
  const { name } = await readBody<{ name?: string }>(event);

  const signedIn = await getSessionUser(event);
  const firstRun = await isFirstRun();

  let targetName: string;
  let targetUserId: number | null = null;
  let existing: { credentialId: string; transports: string[] }[] = [];

  if (signedIn) {
    targetName = signedIn.name;
    targetUserId = signedIn.id;
    existing = await prisma.passkey.findMany({
      where: { userId: signedIn.id },
      select: { credentialId: true, transports: true },
    });
  } else if (firstRun) {
    targetName = (name || 'admin').trim();
  } else {
    if (!name?.trim()) throw createError({ statusCode: 400, statusMessage: 'name required' });
    const user = await prisma.user.findUnique({
      where: { name: name.trim() },
      include: { passkeys: { select: { credentialId: true, transports: true } } },
    });
    if (!user) throw createError({ statusCode: 400, statusMessage: 'Unknown user' });
    if (user.passkeys.length) {
      throw createError({ statusCode: 400, statusMessage: 'User already enrolled — sign in instead' });
    }
    targetName = user.name;
    targetUserId = user.id;
  }

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(targetUserId ? `u${targetUserId}` : `new:${targetName}`),
    userName: targetName,
    attestationType: 'none',
    excludeCredentials: existing.map((p) => ({
      id: p.credentialId,
      transports: p.transports as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
  });

  stashChallenge(event, options.challenge);
  setCookie(event, 'gm_reg_name', targetName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.dev,
    path: '/',
    maxAge: 300,
  });

  return options;
});

type AuthenticatorTransportFuture = 'ble' | 'cable' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb';
