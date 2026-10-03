// Register a domain with its own Cloudflare credentials (account id + an API
// token that has the "Send Email" permission for that account).
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const { name, cfAccountId, cfApiToken } = await readBody<{
    name?: string;
    cfAccountId?: string;
    cfApiToken?: string;
  }>(event);

  const clean = name?.trim().toLowerCase().replace(/^@/, '');
  const acct = cfAccountId?.trim();
  const token = cfApiToken?.trim();

  if (!clean || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(clean)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid domain' });
  }
  if (!acct || !/^[a-f0-9]{32}$/.test(acct)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid Cloudflare account id' });
  }
  if (!token) throw createError({ statusCode: 400, statusMessage: 'API token required' });
  if (await prisma.domain.findUnique({ where: { name: clean } })) {
    throw createError({ statusCode: 409, statusMessage: 'Domain already added' });
  }

  const domain = await prisma.domain.create({
    data: { name: clean, cfAccountId: acct, cfApiToken: token },
  });
  return { id: domain.id, name: domain.name, cfAccountId: domain.cfAccountId };
});
