export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const domains = await prisma.domain.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { mailboxes: true } } },
  });
  return domains.map((d) => ({
    id: d.id,
    name: d.name,
    cfAccountId: d.cfAccountId,
    tokenHint: d.cfApiToken ? `…${d.cfApiToken.slice(-4)}` : null, // never send the full token
    mailboxes: d._count.mailboxes,
    createdAt: d.createdAt,
  }));
});
