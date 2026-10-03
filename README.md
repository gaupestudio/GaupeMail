# GaupeMail

A self-hosted mail client for your organization. Passkey login, per-user mailboxes
across multiple domains, inbound mail from Cloudflare Email Routing, outbound via the
Cloudflare Email Sending API, optional SpamAssassin filtering, and a UI in 8 languages.

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
| `NUXT_SPAM_ASSASSIN_FILE` | optional spam-check command, e.g. `spamc -c` — see [Spam filtering](#spam-filtering); empty disables it |
| `NUXT_PUBLIC_GITHUB_REPO` | optional, repo checked for new releases (default `gaupestudio/GaupeMail`) |

Cloudflare **sending** credentials are **not** in `.env` — each domain stores its own
account id + API token, added in **Settings**.

Changes to `.env`, `nuxt.config.ts` or the `version` in `package.json` need a restart of
`bun run dev`.

## First run

Open the app → name your organization → create the admin account + its passkey.
After that, the admin adds domains, users and mailboxes in **Settings**, where the
organization name and email footer can also be changed. New users
enroll their own passkey from the sign-in page (allowed until they have one).

## Receiving mail

`POST /api/incoming` — from a Cloudflare Email Worker that forwards the raw message.

- Auth: `X-Token: <NUXT_RECV_VERIFY_TOKEN>` (or `Authorization: Bearer <token>`)
- Body: raw RFC822 (`Content-Type: message/rfc822`) or JSON `{ "raw": "..." }`
- Headers `X-To` / `X-From`: envelope addresses; `X-To` routes to a mailbox
- The recipient must match an existing `Mailbox.address` or the message is rejected (422)
- HTML bodies are sanitised (`sanitize-html`) on the way in
- Each message is spam-checked before it is stored (see below); the response includes
  `spam` and `spamScore`

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

## Spam filtering

Set `NUXT_SPAM_ASSASSIN_FILE` to a command that reads the raw message on **stdin** and
prints SpamAssassin's `score/threshold` (e.g. `8.4/5.0`) — on a server with SpamAssassin
installed that is simply:

```bash
NUXT_SPAM_ASSASSIN_FILE="spamc -c"
```

- A message is spam when `score >= threshold`; it gets `spam = true` and its `spamScore`
  is stored, and it lands in the **Spam** folder instead of the Inbox.
- Fail-open: if the command is unset, fails, times out (30 s) or prints something
  unexpected, the mail is delivered normally and a warning is logged.
- Users can move mail either way with the **Spam** / **Not spam** button on a message.
- For local testing on Windows, `spamc.ps1` is a mock `spamc` that prints a random score:
  `NUXT_SPAM_ASSASSIN_FILE="powershell -NoProfile -ExecutionPolicy Bypass -File spamc.ps1"`.
- Don't put `$` in the value — `.env` expands `$VAR`, so it would be replaced.

## Sending mail

`POST /api/send` — `{ mailboxId, to, subject, text?, html? }`. Sends via the domain's
own Cloudflare Email Sending credentials; `from` is the mailbox address. The outbound
copy is stored in **Sent Items**. HTML is sanitised before sending and storing.

## UI

- Sidebar: Compose · Inbox / Starred / Sent Items / Spam / Trash · Settings (admin) ·
  account button at the bottom → switch mailbox / language / sign out
- Compose opens a right-hand drawer with a rich-text or plain-text editor
- Reading pane renders HTML mail inside a script-less sandboxed `<iframe>`
- Star / spam / not spam / trash / restore / delete-forever per message
- Unread counts ignore spam

### Languages

English (US), English (UK), Dansk, Deutsch, Français, Norsk bokmål, Norsk nynorsk and
Svenska, via `@nuxtjs/i18n`. The first visit picks the browser's language; after that the
choice in the account menu is kept in the `gm_locale` cookie. Dates follow the chosen
language. Translations live in `i18n/locales/*.json` — every file must have the same keys,
and `@` must be written as `{'@'}` (vue-i18n syntax).

The quoted "On …, … wrote:" line in replies and forwards uses the sender's language.
Error messages coming from the API are still English.

## Updating

Releases are published at <https://github.com/gaupestudio/GaupeMail/releases>. Admins see:

- a red **You need to update** button under **Settings** in the sidebar when a newer
  release exists (pre-releases included), linking to that release
- **Settings → Version**: installed version, latest release, status and a link to all
  releases

To update:

```bash
git pull
bun install
bunx prisma migrate deploy    # apply new migrations
bun run build
# then restart the server
```

### Releasing

1. Bump `version` in `package.json` and commit.
2. Tag `vX.Y.Z` with the same number and push the tag.
3. Publish a GitHub release for the tag (mark it as pre-release if it is one — admins still
   see it).

Running instances pick it up within 6 hours (the release check is cached server-side) or
right away after a restart.

## Security notes

- HTML mail: sanitised server-side **and** rendered in a `sandbox` iframe without
  `allow-scripts` — no script execution, no inline handlers, no `javascript:` URLs.
- Sessions: httpOnly cookie, 30-day expiry, row in `Session`.
- The passkey enrollment page trusts whoever claims an un-enrolled username first —
  tell new users to enroll promptly after an admin creates their account.
