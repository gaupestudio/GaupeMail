// Set the organization name. Open while the org is unconfigured (bootstrap);
// afterwards only an admin can change it.
export default defineEventHandler(async (event) => {
  const current = await getSetting('orgName');
  if (current) await requireAdmin(event);

  const { orgName } = await readBody<{ orgName?: string }>(event);
  const name = orgName?.trim();
  if (!name || name.length < 2 || name.length > 60) {
    throw createError({ statusCode: 400, statusMessage: 'Organization name must be 2–60 characters' });
  }

  await setSetting('orgName', name);
  return { configured: true, orgName: name };
});
