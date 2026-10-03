// Update org-wide settings. Admin only. Body: { orgName?, orgFooterHtml? }
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const body = await readBody<{ orgName?: string; orgFooterHtml?: string | null }>(event);

  if ('orgName' in body) {
    const name = body.orgName?.trim();
    if (!name || name.length < 2 || name.length > 60) {
      throw createError({ statusCode: 400, statusMessage: 'Organization name must be 2–60 characters' });
    }
    await setSetting('orgName', name);
  }

  if ('orgFooterHtml' in body) {
    const clean = body.orgFooterHtml?.trim() ? cleanMailHtml(body.orgFooterHtml) : '';
    await setSetting('orgFooterHtml', clean);
  }

  return {
    orgName: (await getSetting('orgName')) || 'GaupeMail',
    orgFooterHtml: await getSetting('orgFooterHtml'),
  };
});
