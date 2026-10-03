// Download an attachment (inbound or outbound). Streams the bytes stored in
// Postgres. Only the owner of the attachment's mailbox (or an admin) may fetch it.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Bad id' });

  const att = await prisma.attachment.findUnique({
    where: { id },
    include: { mail: { select: { mailbox: { select: { userId: true } } } } },
  });
  if (!att) throw createError({ statusCode: 404, statusMessage: 'Not found' });
  if (att.mail.mailbox.userId !== user.id && !user.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Not your mailbox' });
  }

  const safeName = att.filename.replace(/[\r\n"]/g, '_');
  setHeader(event, 'Content-Type', att.contentType || 'application/octet-stream');
  setHeader(event, 'Content-Disposition', `attachment; filename="${safeName}"`);
  setHeader(event, 'Content-Length', String(att.size));
  setHeader(event, 'Cache-Control', 'private, max-age=3600');
  return Buffer.from(att.data);
});
