import PostalMime from 'postal-mime';

// Inbound endpoint for the Cloudflare Email Worker.
// Headers: Content-Type: message/rfc822
//          X-Token: <NUXT_RECV_VERIFY_TOKEN>   (or Authorization: Bearer <token>)
//          X-To: <envelope recipient>          (used to route to a mailbox)
//          X-From: <envelope sender>
export default defineEventHandler(async (event) => {
  const expected = useRuntimeConfig(event).recvVerifyToken;
  if (!expected) throw createError({ statusCode: 500, statusMessage: 'Server not configured' });

  const auth = getHeader(event, 'authorization') ?? '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  const token = getHeader(event, 'x-token') || bearer || (getQuery(event).token as string) || '';
  if (token !== expected) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

  const contentType = (getHeader(event, 'content-type') ?? '').toLowerCase();
  let raw: string;
  if (contentType.includes('application/json')) {
    const body = await readBody<{ raw?: string; message?: string }>(event);
    raw = body?.raw ?? body?.message ?? '';
  } else {
    raw = (await readRawBody(event, 'utf-8')) ?? '';
  }
  if (!raw.trim()) throw createError({ statusCode: 400, statusMessage: 'Empty message' });

  const email = await PostalMime.parse(raw);

  const recipient = (
    getHeader(event, 'x-to') ||
    email.to?.[0]?.address ||
    ''
  ).trim().toLowerCase();
  if (!recipient) throw createError({ statusCode: 400, statusMessage: 'No recipient' });

  const mailbox = await prisma.mailbox.findUnique({ where: { address: recipient } });
  if (!mailbox) throw createError({ statusCode: 422, statusMessage: `No mailbox for ${recipient}` });

  if (email.messageId) {
    const dupe = await prisma.mail.findUnique({ where: { messageId: email.messageId } });
    if (dupe) return { ok: true, id: dupe.id, duplicate: true };
  }

  const spam = await checkSpamFiltering(raw);

  const mail = await prisma.mail.create({
    data: {
      direction: 'INBOUND',
      messageId: email.messageId ?? null,
      from: email.from?.address ?? getHeader(event, 'x-from') ?? 'unknown',
      fromName: email.from?.name || null,
      to: (email.to ?? []).map((a) => a.address).filter(Boolean).join(', ') || recipient,
      cc: (email.cc ?? []).map((a) => a.address).filter(Boolean).join(', ') || null,
      subject: email.subject ?? '(no subject)',
      bodyText: email.text ?? null,
      bodyHTML: email.html ? cleanMailHtml(email.html) : null,
      spam: spam?.isSpam ?? false,
      spamScore: spam?.score ?? null,
      mailboxId: mailbox.id,
      attachments: {
        create: (email.attachments ?? []).map((a) => ({
          filename: a.filename ?? 'attachment',
          contentType: a.mimeType ?? 'application/octet-stream',
          size: typeof a.content === 'string' ? a.content.length : a.content.byteLength,
          data: Buffer.from(
            typeof a.content === 'string'
              ? Buffer.from(a.content, 'base64')
              : new Uint8Array(a.content),
          ),
        })),
      },
    },
  });

  return { ok: true, id: mail.id, mailbox: mailbox.address, spam: mail.spam, spamScore: mail.spamScore };
});
