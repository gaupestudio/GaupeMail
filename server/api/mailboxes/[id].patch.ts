// Update a mailbox. Admin, or the mailbox owner (for their own signature/label).
// Body: { label?, signatureHtml? }
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Bad id' });

  const box = await prisma.mailbox.findUnique({ where: { id } });
  if (!box) throw createError({ statusCode: 404, statusMessage: 'Not found' });
  if (box.userId !== user.id && !user.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Not your mailbox' });
  }

  const body = await readBody<{ label?: string | null; signatureHtml?: string | null }>(event);
  const data: Record<string, unknown> = {};
  if ('label' in body) data.label = body.label?.trim() || null;
  if ('signatureHtml' in body) {
    data.signatureHtml = body.signatureHtml?.trim() ? cleanMailHtml(body.signatureHtml) : null;
  }
  if (!Object.keys(data).length) throw createError({ statusCode: 400, statusMessage: 'Nothing to update' });

  const updated = await prisma.mailbox.update({ where: { id }, data });
  return { id: updated.id, label: updated.label, signatureHtml: updated.signatureHtml };
});
