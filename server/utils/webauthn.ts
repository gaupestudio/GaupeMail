import type { H3Event } from 'h3';

export function waConfig(event: H3Event) {
  const c = useRuntimeConfig(event);
  return {
    // rpID is a bare hostname — strip any scheme/port/path/trailing slash.
    rpID: String(c.webauthnRpId)
      .replace(/^https?:\/\//, '')
      .replace(/[:/].*$/, '')
      .trim(),
    rpName: c.webauthnRpName,
    // origin is scheme + host [+ port], never a trailing slash or path.
    origin: String(c.webauthnOrigin).trim().replace(/\/+$/, ''),
  };
}
