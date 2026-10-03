// Admin creates a mailbox (address on a domain) and assigns it to a user.
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const { localPart, domainId, userId, label } = await readBody<{
    localPart?: string;
    domainId?: number;
    userId?: number;
    label?: string;
  }>(event);

  const lp = localPart?.trim().toLowerCase();
  if (!lp || !/^[a-z0-9._%+-]+$/.test(lp)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid local part' });
  }
  const domain = await prisma.domain.findUnique({ where: { id: Number(domainId) } });
  if (!domain) throw createError({ statusCode: 400, statusMessage: 'Unknown domain' });
  const owner = await prisma.user.findUnique({ where: { id: Number(userId) } });
  if (!owner) throw createError({ statusCode: 400, statusMessage: 'Unknown user' });

  const address = `${lp}@${domain.name}`;
  if (await prisma.mailbox.findUnique({ where: { address } })) {
    throw createError({ statusCode: 409, statusMessage: 'Address already exists' });
  }

  const box = await prisma.mailbox.create({
    data: { address, label: label?.trim() || null, domainId: domain.id, userId: owner.id },
  });
  return { id: box.id, address: box.address, label: box.label };
});
