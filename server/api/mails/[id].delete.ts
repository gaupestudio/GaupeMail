// Soft-delete (move to trash). `?hard=1` permanently deletes (used from trash).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Bad id' });
  const hard = getQuery(event).hard === '1';

  const mail = await prisma.mail.findUnique({
    where: { id },
    select: { id: true, mailbox: { select: { userId: true } } },
  });
  if (!mail) throw createError({ statusCode: 404, statusMessage: 'Not found' });
  if (mail.mailbox.userId !== user.id && !user.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Not your mailbox' });
  }

  if (hard) await prisma.mail.delete({ where: { id } });
  else await prisma.mail.update({ where: { id }, data: { deletedAt: new Date() } });

  return { ok: true, hard };
});
