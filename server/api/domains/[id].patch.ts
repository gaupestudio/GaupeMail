// Update a domain's Cloudflare credentials.
// Body: { cfAccountId?, cfApiToken? }
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Bad id' });
  const body = await readBody<{ cfAccountId?: string; cfApiToken?: string }>(event);

  const data: Record<string, string> = {};
  if (body.cfAccountId?.trim()) {
    if (!/^[a-f0-9]{32}$/.test(body.cfAccountId.trim())) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid Cloudflare account id' });
    }
    data.cfAccountId = body.cfAccountId.trim();
  }
  if (body.cfApiToken?.trim()) data.cfApiToken = body.cfApiToken.trim();
  if (!Object.keys(data).length) throw createError({ statusCode: 400, statusMessage: 'Nothing to update' });

  const domain = await prisma.domain.update({ where: { id }, data });
  return { id: domain.id, name: domain.name, cfAccountId: domain.cfAccountId };
});
