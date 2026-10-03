import { verifyAuthenticationResponse } from '@simplewebauthn/server';

export default defineEventHandler(async (event) => {
  const { rpID, origin } = waConfig(event);
  const { response } = await readBody<{ response: any }>(event);
  const expectedChallenge = popChallenge(event);

  const passkey = await prisma.passkey.findUnique({
    where: { credentialId: response?.id },
    include: { user: true },
  });
  if (!passkey) throw createError({ statusCode: 401, statusMessage: 'Unknown passkey' });

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
    credential: {
      id: passkey.credentialId,
      publicKey: passkey.publicKey,
      counter: Number(passkey.counter),
      transports: passkey.transports as any,
    },
  });
  if (!verification.verified) throw createError({ statusCode: 401, statusMessage: 'Verification failed' });

  await prisma.passkey.update({
    where: { id: passkey.id },
    data: { counter: BigInt(verification.authenticationInfo.newCounter), lastUsedAt: new Date() },
  });

  await createSession(event, passkey.userId);
  const u = passkey.user;
  return { user: { id: u.id, name: u.name, displayName: u.displayName, isAdmin: u.isAdmin } };
});
