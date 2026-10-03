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

// `header` builds the localized "On <when>, <who> wrote:" line.
export function quoteBlock(o: MailDetail, header: (when: string, who: string) => string) {
  const inner = o.bodyHTML || `<div>${escapeHtml(o.bodyText || '').replace(/\n/g, '<br>')}</div>`;
  const line = header(escapeHtml(fmtFull(o.receivedAt)), escapeHtml(o.fromName || o.from));
  return `<br><br><blockquote>${line}<br><br>${inner}</blockquote>`;
}
