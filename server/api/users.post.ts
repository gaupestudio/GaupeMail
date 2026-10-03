// Admin creates a user. They enroll their own passkey from the login page
// (allowed while they have none).
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const { name, displayName, isAdmin } = await readBody<{
    name?: string;
    displayName?: string;
    isAdmin?: boolean;
  }>(event);

  const clean = name?.trim();
  if (!clean || !/^[a-zA-Z0-9._-]{2,32}$/.test(clean)) {
    throw createError({ statusCode: 400, statusMessage: 'Name must be 2-32 chars: letters, digits, . _ -' });
  }
  if (await prisma.user.findUnique({ where: { name: clean } })) {
    throw createError({ statusCode: 409, statusMessage: 'Name taken' });
  }

  const user = await prisma.user.create({
    data: { name: clean, displayName: displayName?.trim() || null, isAdmin: Boolean(isAdmin) },
  });
  return { id: user.id, name: user.name, displayName: user.displayName, isAdmin: user.isAdmin };
});
