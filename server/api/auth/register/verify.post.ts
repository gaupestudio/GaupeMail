import { verifyRegistrationResponse } from '@simplewebauthn/server';

export default defineEventHandler(async (event) => {
  const { rpID, origin } = waConfig(event);
  const body = await readBody<{ response: any; displayName?: string }>(event);
  const expectedChallenge = popChallenge(event);
  const regName = getCookie(event, 'gm_reg_name');
  deleteCookie(event, 'gm_reg_name', { path: '/' });

  const verification = await verifyRegistrationResponse({
    response: body.response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw createError({ statusCode: 401, statusMessage: 'Passkey verification failed' });
  }
  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  const signedIn = await getSessionUser(event);
  const firstRun = await isFirstRun();

  let user;
  if (signedIn) {
    user = signedIn;
  } else if (firstRun) {
    user = await prisma.user.create({
      data: { name: (regName || 'admin').trim(), displayName: body.displayName?.trim() || null, isAdmin: true },
    });
  } else {
    if (!regName) throw createError({ statusCode: 400, statusMessage: 'Lost registration context' });
    const found = await prisma.user.findUnique({
      where: { name: regName },
      include: { passkeys: true },
    });
    if (!found) throw createError({ statusCode: 400, statusMessage: 'Unknown user' });
    if (found.passkeys.length) throw createError({ statusCode: 400, statusMessage: 'Already enrolled' });
    user = found;
  }

  await prisma.passkey.create({
    data: {
      userId: user.id,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: credential.transports ?? [],
    },
  });

  await createSession(event, user.id);
  return { user: { id: user.id, name: user.name, displayName: user.displayName, isAdmin: user.isAdmin } };
});
