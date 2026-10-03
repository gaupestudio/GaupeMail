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
      _count: { select: { mails: { where: { direction: 'INBOUND', read: false, spam: false, deletedAt: null } } } },
    },
  });

  return boxes.map((b) => ({
    id: b.id,
    address: b.address,
    label: b.label,
    signatureHtml: b.signatureHtml,
    domain: b.domain.name,
    owner: b.user,
    unread: b._count.mails,
  }));
});
