import type { H3Event } from 'h3';
import type { User } from '../generated/prisma/client';

/** Loads a mailbox the user is allowed to see (owner, or any if admin). */
export async function accessibleMailbox(event: H3Event, user: User, mailboxId: number) {
  const box = await prisma.mailbox.findUnique({
    where: { id: mailboxId },
    include: { domain: true },
  });
  if (!box) throw createError({ statusCode: 404, statusMessage: 'Mailbox not found' });
  if (box.userId !== user.id && !user.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Not your mailbox' });
  }
  return box;
}
