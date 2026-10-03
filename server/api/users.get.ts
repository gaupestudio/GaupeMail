export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' },
    include: { _count: { select: { passkeys: true, mailboxes: true } } },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    displayName: u.displayName,
    isAdmin: u.isAdmin,
    passkeys: u._count.passkeys,
    mailboxes: u._count.mailboxes,
    enrolled: u._count.passkeys > 0,
    createdAt: u.createdAt,
  }));
});
