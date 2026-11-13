// `?all=1` (admin) lists every mailbox; otherwise lists the caller's own.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const all = getQuery(event).all === '1';
  if (all && !user.isAdmin) throw createError({ statusCode: 403, statusMessage: 'Admin only' });

  const boxes = await prisma.mailbox.findMany({
    where: all ? {} : { userId: user.id },
    orderBy: { address: 'asc' },
    include: {
      domain: { select: { name: true } },
      user: { select: { id: true, name: true } },
    },
  });

  // unread counts per mailbox, split into inbox (not spam) and spam
  const grouped = await prisma.mail.groupBy({
    by: ['mailboxId', 'spam'],
    where: { mailboxId: { in: boxes.map((b) => b.id) }, direction: 'INBOUND', read: false, deletedAt: null },
    _count: { _all: true },
  });
  const unreadOf = (id: number, spam: boolean) =>
    grouped.find((g) => g.mailboxId === id && g.spam === spam)?._count._all ?? 0;

  return boxes.map((b) => ({
    id: b.id,
    address: b.address,
    label: b.label,
    signatureHtml: b.signatureHtml,
    domain: b.domain.name,
    owner: b.user,
    unread: unreadOf(b.id, false),
    spamUnread: unreadOf(b.id, true),
  }));
});
