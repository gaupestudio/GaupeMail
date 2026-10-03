const API = 'https://api.cloudflare.com/client/v4';

/** Send a message through a domain's own Cloudflare Email Sending credentials. */
export async function cfSend(
  domain: { cfAccountId: string; cfApiToken: string; name: string },
  payload: Record<string, unknown>,
) {
  const res = await $fetch<{ success: boolean; errors: unknown[] }>(
    `${API}/accounts/${domain.cfAccountId}/email/sending/send`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${domain.cfApiToken}`, 'Content-Type': 'application/json' },
      body: payload,
    },
  ).catch((e: { data?: unknown; message?: string }) => {
    throw createError({ statusCode: 502, statusMessage: 'Cloudflare send failed', data: e?.data ?? e?.message });
  });
  if (!res.success) {
    throw createError({ statusCode: 502, statusMessage: 'Cloudflare send failed', data: res.errors });
  }
  return res;
}
