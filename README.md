# GaupeMail

A private mail client for the **Gaupestudio** "organization" (single org, hardcoded).
Passkey login, per-user mailboxes across multiple domains, inbound mail from
Cloudflare Email Routing, outbound via the Cloudflare Email Sending API.

## Setup

```bash
bun install
cp .env.example .env          # edit values
bunx prisma migrate deploy    # apply schema
bunx prisma generate
bun run dev                   # http://localhost:3000
```

### `.env`

| var | purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `NUXT_RECV_VERIFY_TOKEN` | shared secret the inbound webhook checks (`openssl rand -hex 32`) |
| `NUXT_WEBAUTHN_RP_ID` | hostname in the browser URL — `localhost` in dev, your domain in prod |
| `NUXT_WEBAUTHN_RP_NAME` | display name shown in the passkey prompt |
| `NUXT_WEBAUTHN_ORIGIN` | full origin incl. scheme + port — `http://localhost:3000` in dev |

Cloudflare **sending** credentials are **not** in `.env` — each domain stores its own
account id + API token, added in **Settings**.

## First run

Open the app → it detects there are no users → create the admin account + its passkey.
After that, the admin adds domains, users and mailboxes in **Settings**. New users
enroll their own passkey from the sign-in page (allowed until they have one).

## Receiving mail

`POST /api/incoming` — from a Cloudflare Email Worker that forwards the raw message.

- Auth: `X-Token: <NUXT_RECV_VERIFY_TOKEN>` (or `Authorization: Bearer <token>`)
- Body: raw RFC822 (`Content-Type: message/rfc822`) or JSON `{ "raw": "..." }`
- Headers `X-To` / `X-From`: envelope addresses; `X-To` routes to a mailbox
- The recipient must match an existing `Mailbox.address` or the message is rejected (422)
- HTML bodies are sanitised (`sanitize-html`) on the way in

### Cloudflare Email Worker

```js
export default {
  async email(message, env) {
    await fetch("https://YOUR_HOST/api/incoming", {
      method: "POST",
      headers: {
        "Content-Type": "message/rfc822",
        "X-Token": env.RECV_VERIFY_TOKEN,
        "X-From": message.from,
        "X-To": message.to,
      },
      body: message.raw,
    });
  },
};
```

## Sending mail

`POST /api/send` — `{ mailboxId, to, subject, text?, html? }`. Sends via the domain's
own Cloudflare Email Sending credentials; `from` is the mailbox address. The outbound
copy is stored in **Sent Items**. HTML is sanitised before sending and storing.

## UI

- Sidebar: Compose · Inbox / Starred / Sent Items / Trash · Settings (admin) ·
  account button at the bottom → switch mailbox / sign out
- Compose opens a right-hand drawer with a rich-text or plain-text editor
- Reading pane renders HTML mail inside a script-less sandboxed `<iframe>`
- Star / trash / restore / delete-forever per message

## Security notes

- HTML mail: sanitised server-side **and** rendered in a `sandbox` iframe without
  `allow-scripts` — no script execution, no inline handlers, no `javascript:` URLs.
- Sessions: httpOnly cookie, 30-day expiry, row in `Session`.
- The passkey enrollment page trusts whoever claims an un-enrolled username first —
  fine for a private tool; tell users to enroll promptly.
