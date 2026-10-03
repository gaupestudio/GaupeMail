// Helpers for building reply / forward drafts (auto-imported by Nuxt).
import type { MailDetail } from '~/composables/useMail';

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// "Name <a@b.c>, d@e.f" -> ['a@b.c', 'd@e.f']
export const splitAddr = (s: string | null | undefined) =>
  (s ?? '')
    .split(',')
    .map((x) => x.trim().replace(/^.*<(.+?)>.*$/, '$1'))
    .filter(Boolean);

export function quoteBlock(o: MailDetail) {
  const when = new Date(o.receivedAt).toLocaleString();
  const inner = o.bodyHTML || `<div>${escapeHtml(o.bodyText || '').replace(/\n/g, '<br>')}</div>`;
  return `<br><br><blockquote>On ${escapeHtml(when)}, ${escapeHtml(o.fromName || o.from)} wrote:<br><br>${inner}</blockquote>`;
}
