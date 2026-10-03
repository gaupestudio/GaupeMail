export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event);
  return {
    user: user
      ? { id: user.id, name: user.name, displayName: user.displayName, isAdmin: user.isAdmin }
      : null,
    firstRun: await isFirstRun(),
  };
});
