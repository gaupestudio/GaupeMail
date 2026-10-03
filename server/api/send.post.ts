// Send from one of the caller's mailboxes via the Cloudflare Email Sending API.
// Body: { mailboxId, to, cc?, bcc?, replyTo?, subject, text?, html?, attachments? }
// to/cc/bcc accept a comma-separated string or an array of strings.
// attachments: [{ filename, type?, contentBase64 }]
const addrs = (v: unknown): string[] =>
  (Array.isArray(v) ? v : String(v ?? '').split(','))
    .map((s) => String(s).trim())
    .filter(Boolean);

// Cloudflare Email Sending caps the whole message (body + attachments) at 5 MiB;
// stay under it with margin for MIME/base64 overhead.
const MAX_MESSAGE_BYTES = 4 * 1024 * 1024;

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);

  const body = await readBody<{
    mailboxId?: number;
    to?: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
    subject?: string;
    text?: string;
    html?: string;
    attachments?: { filename?: string; type?: string; contentBase64?: string }[];
  }>(event);

  const to = addrs(body?.to);
  const cc = addrs(body?.cc);
  const bcc = addrs(body?.bcc);
  const subject = body?.subject?.trim();

  if (!Number.isInteger(body?.mailboxId)) throw createError({ statusCode: 400, statusMessage: 'mailboxId required' });
  if (!to.length) throw createError({ statusCode: 400, statusMessage: 'Add at least one recipient' });
  if (to.length + cc.length + bcc.length > 50) {
    throw createError({ statusCode: 400, statusMessage: 'Too many recipients (max 50)' });
  }
  if (!subject) throw createError({ statusCode: 400, statusMessage: 'Missing subject' });
  if (!body?.text && !body?.html) throw createError({ statusCode: 400, statusMessage: 'Missing body' });

  const mailbox = await accessibleMailbox(event, user, body!.mailboxId!);

  // Compose body + per-mailbox footer + organization footer (both optional).
  const mailboxFooter = mailbox.signatureHtml ? cleanMailHtml(mailbox.signatureHtml) : '';
  const orgFooter = (await getSetting('orgFooterHtml')) || '';
  let html = body.html ? cleanMailHtml(body.html) : null;
  let text = body.text ?? null;
  for (const footer of [mailboxFooter, orgFooter]) {
    if (!footer) continue;
    html = `${html ?? textToHtml(text ?? '')}<br><br>${footer}`;
    if (text != null) text = `${text}\n\n${htmlToText(footer)}`;
  }

  // Attachments (decoded once, reused for Cloudflare + local storage).
  const files = (Array.isArray(body.attachments) ? body.attachments : [])
    .filter((a) => a?.contentBase64)
    .map((a) => ({
      filename: (a.filename || 'attachment').replace(/[\r\n"]/g, '_').slice(0, 200),
      type: a.type || 'application/octet-stream',
      buf: Buffer.from(a.contentBase64!, 'base64'),
    }));

  const totalBytes =
    Buffer.byteLength(html ?? '') +
    Buffer.byteLength(text ?? '') +
    files.reduce((n, f) => n + f.buf.length, 0);
  if (totalBytes > MAX_MESSAGE_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Message + attachments exceed 4 MB' });
  }

  const payload: Record<string, unknown> = {
    from: mailbox.label ? { address: mailbox.address, name: mailbox.label } : mailbox.address,
    to,
    subject,
    ...(cc.length ? { cc } : {}),
    ...(bcc.length ? { bcc } : {}),
    ...(body.replyTo?.trim() ? { reply_to: body.replyTo.trim() } : {}),
    ...(text != null ? { text } : {}),
    ...(html ? { html } : {}),
    ...(files.length
      ? {
          attachments: files.map((f) => ({
            content: f.buf.toString('base64'),
            filename: f.filename,
            type: f.type,
            disposition: 'attachment',
          })),
        }
      : {}),
  };
  await cfSend(mailbox.domain, payload);

  const mail = await prisma.mail.create({
    data: {
      direction: 'OUTBOUND',
      from: mailbox.address,
      fromName: mailbox.label || user.displayName || null,
      to: to.join(', '),
      cc: cc.length ? cc.join(', ') : null,
      subject,
      bodyText: text,
      bodyHTML: html,
      read: true,
      mailboxId: mailbox.id,
      attachments: {
        create: files.map((f) => ({
          filename: f.filename,
          contentType: f.type,
          size: f.buf.length,
          data: f.buf,
        })),
      },
    },
  });

  return { ok: true, id: mail.id };
});

function textToHtml(t: string) {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}
function htmlToText(h: string) {
  return h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
