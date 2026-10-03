import type { Prisma } from '../generated/prisma/client';

// List messages in one mailbox. `?mailboxId=` required, `?filter=` one of
// inbox | starred | sent | trash (default inbox).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const q = getQuery(event);
  const mailboxId = Number(q.mailboxId);
  if (!Number.isInteger(mailboxId)) throw createError({ statusCode: 400, statusMessage: 'mailboxId required' });
  await accessibleMailbox(event, user, mailboxId);

  const filter = String(q.filter ?? 'inbox');
  const where: Prisma.MailWhereInput = { mailboxId };
  if (filter === 'trash') {
    where.deletedAt = { not: null };
  } else {
    where.deletedAt = null;
    if (filter === 'starred') where.starred = true;
    else if (filter === 'sent') where.direction = 'OUTBOUND';
    else where.direction = 'INBOUND';
  }

  const mails = await prisma.mail.findMany({
    where,
    orderBy: { receivedAt: 'desc' },
    select: {
      id: true,
      direction: true,
      from: true,
      fromName: true,
      to: true,
      subject: true,
      bodyText: true,
      bodyHTML: true,
      receivedAt: true,
      read: true,
      starred: true,
      _count: { select: { attachments: true } },
    },
  });

  return mails.map((m) => ({
    id: m.id,
    direction: m.direction,
    from: m.from,
    fromName: m.fromName,
    to: m.to,
    subject: m.subject,
    receivedAt: m.receivedAt,
    read: m.read,
    starred: m.starred,
    attachments: m._count.attachments,
    isHtml: !m.bodyText && !!m.bodyHTML,
    preview: (m.bodyText || (m.bodyHTML ?? '').replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160),
  }));
});
