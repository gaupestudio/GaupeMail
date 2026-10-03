// Display helpers shared across the mail UI (auto-imported by Nuxt).

// Active UI locale, so dates follow the chosen language (en-GB vs en-US etc.).
const uiLocale = () => {
  try {
    return useNuxtApp().$i18n.locale.value;
  } catch {
    return undefined;
  }
};

export const fmtShort = (d: string) => {
  const date = new Date(d);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString(uiLocale(), { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString(uiLocale(), { month: 'short', day: 'numeric' });
};

export const fmtFull = (d: string) => new Date(d).toLocaleString(uiLocale());

export function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

export const errMsg = (e: any) =>
  e?.data?.message || e?.data?.statusMessage || e?.statusMessage || e?.message || 'Request failed';
