import { generateAuthenticationOptions } from '@simplewebauthn/server';

export default defineEventHandler(async (event) => {
  const { rpID } = waConfig(event);
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    allowCredentials: [], // usernameless — resident key picks the account
  });
  stashChallenge(event, options.challenge);
  return options;
});
