// Public — tells the client whether the organization has been set up yet,
// so it can redirect to /setup.
export default defineEventHandler(async () => {
  const orgName = await getSetting('orgName');
  return {
    configured: !!orgName,
    orgName: orgName || null,
    firstRun: (await prisma.user.count()) === 0,
  };
});
