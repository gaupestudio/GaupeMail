export default defineEventHandler(async (event) => {
  const me = await requireAdmin(event);
  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Bad id' });
  if (id === me.id) throw createError({ statusCode: 400, statusMessage: "Can't delete yourself" });
  await prisma.user.delete({ where: { id } });
  return { ok: true };
});
