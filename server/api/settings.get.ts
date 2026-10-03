export default defineEventHandler(async (event) => {
  await requireUser(event);
  return {
    orgName: (await getSetting('orgName')) || 'GaupeMail',
    orgFooterHtml: await getSetting('orgFooterHtml'),
  };
});
