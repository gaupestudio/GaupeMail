export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Bad id' });
  await prisma.mailbox.delete({ where: { id } });
  return { ok: true };
});
