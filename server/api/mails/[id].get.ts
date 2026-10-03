// Full message. Marks inbound mail read.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Bad id' });

  const mail = await prisma.mail.findUnique({
    where: { id },
    include: {
      mailbox: { select: { id: true, address: true, userId: true } },
      attachments: { select: { id: true, filename: true, contentType: true, size: true } },
    },
  });
  if (!mail) throw createError({ statusCode: 404, statusMessage: 'Not found' });
  if (mail.mailbox.userId !== user.id && !user.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Not your mailbox' });
  }

  if (!mail.read) await prisma.mail.update({ where: { id }, data: { read: true } });

  return {
    id: mail.id,
    direction: mail.direction,
    from: mail.from,
    fromName: mail.fromName,
    to: mail.to,
    cc: mail.cc,
    subject: mail.subject,
    bodyText: mail.bodyText,
    bodyHTML: mail.bodyHTML ? cleanMailHtml(mail.bodyHTML) : null, // re-sanitize on the way out
    receivedAt: mail.receivedAt,
    starred: mail.starred,
    deleted: !!mail.deletedAt,
    spam: mail.spam,
    spamScore: mail.spamScore,
    read: true,
    mailbox: mail.mailbox.address,
    attachments: mail.attachments,
  };
});
