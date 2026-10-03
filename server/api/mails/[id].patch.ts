// Toggle flags on a message. Body: { starred?, read?, deleted?, spam? }
// deleted:true -> move to trash, deleted:false -> restore.
// spam:true -> move to spam, spam:false -> back to inbox.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Bad id' });
  const body = await readBody<{ starred?: boolean; read?: boolean; deleted?: boolean; spam?: boolean }>(event);

  const mail = await prisma.mail.findUnique({
    where: { id },
    select: { id: true, mailbox: { select: { userId: true } } },
  });
  if (!mail) throw createError({ statusCode: 404, statusMessage: 'Not found' });
  if (mail.mailbox.userId !== user.id && !user.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Not your mailbox' });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.starred === 'boolean') data.starred = body.starred;
  if (typeof body.read === 'boolean') data.read = body.read;
  if (typeof body.deleted === 'boolean') data.deletedAt = body.deleted ? new Date() : null;
  if (typeof body.spam === 'boolean') data.spam = body.spam;
  if (!Object.keys(data).length) throw createError({ statusCode: 400, statusMessage: 'Nothing to change' });

  const updated = await prisma.mail.update({ where: { id }, data });
  return {
    id: updated.id,
    starred: updated.starred,
    read: updated.read,
    deleted: !!updated.deletedAt,
    spam: updated.spam,
  };
});
