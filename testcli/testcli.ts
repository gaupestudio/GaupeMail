// GaupeMail dev/test CLI — run with:  bun run testcli <command>
//
//   domain add <name>                       force-add a domain (no Cloudflare creds)
//   domain list
//   domain rm <name>
//   user add <name> [--admin] [--display "Name"]
//   user list
//   mailbox add <address> <user> [--label "Label"]   (creates domain/user if missing)
//   mailbox list
//   send <address> [-n 5] [--attach] [--url http://localhost:3000]
//                                           POST random mails to /api/incoming
//   seed                                    test.local + user "test" + 2 mailboxes + 10 mails
//
// Bun loads .env automatically (DATABASE_URL, NUXT_RECV_VERIFY_TOKEN).
import { prisma } from '../server/utils/prisma';

// ---------- args ----------
const argv = process.argv.slice(2);
const flags: Record<string, string | true> = {};
const pos: string[] = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]!;
  if (a.startsWith('-')) {
    const key = a.replace(/^-+/, '');
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('-')) {
      flags[key] = next;
      i++;
    } else flags[key] = true;
  } else pos.push(a);
}
const flag = (k: string) => (typeof flags[k] === 'string' ? (flags[k] as string) : undefined);

function die(msg: string): never {
  console.error(`error: ${msg}`);
  process.exit(1);
}

// ---------- random mail ----------
const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]!;
const rid = () => Math.random().toString(36).slice(2, 10);

const firstNames = ['Anna', 'Mads', 'Sofie', 'Lars', 'Freja', 'Emil', 'Ida', 'Noah', 'Clara', 'Oscar'];
const lastNames = ['Jensen', 'Nielsen', 'Hansen', 'Pedersen', 'Larsen', 'Holm', 'Berg', 'Krogh'];
const senderDomains = ['example.com', 'acme.io', 'mail.test', 'foobar.dk', 'studio.net'];
const subjects = [
  'Quick question about the project',
  'Invoice #{n}',
  'Meeting notes from today',
  'Re: Deadline next week',
  'Your order #{n} has shipped',
  'Lunch on Friday?',
  'Feedback on the latest designs',
  'Weekly update',
  'Contract draft v{n}',
  'Can you take a look at this?',
];
const lines = [
  'Hope you are doing well.',
  'I wanted to follow up on our conversation from earlier.',
  'Let me know if you have any questions.',
  'Attached is the file we talked about.',
  'Could you get back to me before Thursday?',
  'Thanks again for the help last week.',
  'The numbers look good so far, but we should double check the totals.',
  'I moved the meeting to 14:00 so everyone can make it.',
  'No rush on this one.',
  'See the details below.',
];

const b64 = (s: string) => Buffer.from(s).toString('base64').replace(/.{76}/g, '$&\r\n');

function randomMail(to: string, attach: boolean) {
  const first = pick(firstNames);
  const last = pick(lastNames);
  const fromAddr = `${first}.${last}@${pick(senderDomains)}`.toLowerCase();
  const subject = pick(subjects).replace('{n}', String(1000 + Math.floor(Math.random() * 9000)));
  const body = Array.from({ length: 2 + Math.floor(Math.random() * 4) }, () => pick(lines));
  const text = `Hi,\n\n${body.join('\n\n')}\n\nBest,\n${first}`;
  const html = Math.random() < 0.6
    ? `<p>Hi,</p>${body.map((l) => `<p>${l}</p>`).join('')}<p>Best,<br><b>${first} ${last}</b></p>`
    : null;

  const alt = `alt_${rid()}`;
  const mixed = `mix_${rid()}`;
  const head = [
    `From: "${first} ${last}" <${fromAddr}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${rid()}${rid()}@${fromAddr.split('@')[1]}>`,
    'MIME-Version: 1.0',
  ];

  const textPart = ['Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64', '', b64(text)];
  const content = html
    ? [
        `Content-Type: multipart/alternative; boundary="${alt}"`,
        '',
        `--${alt}`,
        ...textPart,
        `--${alt}`,
        'Content-Type: text/html; charset=utf-8',
        'Content-Transfer-Encoding: base64',
        '',
        b64(html),
        `--${alt}--`,
      ]
    : textPart;

  const parts = attach
    ? [
        `Content-Type: multipart/mixed; boundary="${mixed}"`,
        '',
        `--${mixed}`,
        ...content,
        `--${mixed}`,
        'Content-Type: text/plain; name="notes.txt"',
        'Content-Disposition: attachment; filename="notes.txt"',
        'Content-Transfer-Encoding: base64',
        '',
        b64(`Random attachment ${rid()}\n${body.join('\n')}\n`),
        `--${mixed}--`,
      ]
    : content;

  return { raw: [...head, ...parts, ''].join('\r\n'), from: fromAddr, subject };
}

async function send(address: string, count: number, attach: boolean | 'random', url: string) {
  const token = process.env.NUXT_RECV_VERIFY_TOKEN;
  if (!token) die('NUXT_RECV_VERIFY_TOKEN is not set in .env');
  for (let i = 0; i < count; i++) {
    const m = randomMail(address, attach === 'random' ? Math.random() < 0.25 : attach);
    const res = await fetch(`${url}/api/incoming`, {
      method: 'POST',
      headers: { 'Content-Type': 'message/rfc822', 'X-Token': token, 'X-To': address, 'X-From': m.from },
      body: m.raw,
    }).catch((e) => die(`can't reach ${url} — is the dev server running? (${e.message})`));
    const out = await res.text();
    if (!res.ok) die(`${res.status} ${out}`);
    console.log(`sent  ${m.from.padEnd(32)} ${m.subject}`);
  }
}

// ---------- db helpers ----------
async function ensureDomain(name: string) {
  return prisma.domain.upsert({
    where: { name },
    update: {},
    create: { name, cfAccountId: '', cfApiToken: '' },
  });
}

async function ensureUser(name: string, opts: { admin?: boolean; display?: string } = {}) {
  return prisma.user.upsert({
    where: { name },
    update: {
      ...(opts.admin ? { isAdmin: true } : {}),
      ...(opts.display ? { displayName: opts.display } : {}),
    },
    create: { name, isAdmin: !!opts.admin, displayName: opts.display ?? null },
  });
}

async function ensureMailbox(address: string, userName: string, label?: string) {
  address = address.toLowerCase();
  const domainName = address.split('@')[1];
  if (!domainName) die(`bad address: ${address}`);
  const domain = await ensureDomain(domainName);
  const user = await ensureUser(userName);
  return prisma.mailbox.upsert({
    where: { address },
    update: { userId: user.id, ...(label ? { label } : {}) },
    create: { address, label: label ?? null, domainId: domain.id, userId: user.id },
  });
}

// ---------- commands ----------
const [cmd, sub, a1, a2] = pos;

try {
  switch (`${cmd} ${sub ?? ''}`.trim()) {
    case 'domain add': {
      if (!a1) die('usage: domain add <name>');
      const d = await ensureDomain(a1.toLowerCase());
      console.log(`domain #${d.id} ${d.name}`);
      break;
    }
    case 'domain list':
      for (const d of await prisma.domain.findMany({ include: { _count: { select: { mailboxes: true } } } }))
        console.log(`#${d.id}  ${d.name}  (${d._count.mailboxes} mailboxes${d.cfApiToken ? '' : ', no CF creds'})`);
      break;
    case 'domain rm': {
      if (!a1) die('usage: domain rm <name>');
      await prisma.domain.delete({ where: { name: a1.toLowerCase() } });
      console.log(`removed ${a1} (and its mailboxes)`);
      break;
    }
    case 'user add': {
      if (!a1) die('usage: user add <name> [--admin] [--display "Name"]');
      const u = await ensureUser(a1, { admin: !!flags.admin, display: flag('display') });
      console.log(`user #${u.id} ${u.name}${u.isAdmin ? ' (admin)' : ''}`);
      break;
    }
    case 'user list':
      for (const u of await prisma.user.findMany({ include: { mailboxes: true, _count: { select: { passkeys: true } } } }))
        console.log(
          `#${u.id}  ${u.name}${u.isAdmin ? ' (admin)' : ''}  passkeys:${u._count.passkeys}  ${u.mailboxes.map((b) => b.address).join(', ')}`,
        );
      break;
    case 'mailbox add': {
      if (!a1 || !a2) die('usage: mailbox add <address> <user> [--label "Label"]');
      const b = await ensureMailbox(a1, a2, flag('label'));
      console.log(`mailbox #${b.id} ${b.address} -> ${a2}`);
      break;
    }
    case 'mailbox list':
      for (const b of await prisma.mailbox.findMany({ include: { user: true, _count: { select: { mails: true } } } }))
        console.log(`#${b.id}  ${b.address}  owner:${b.user.name}  mails:${b._count.mails}`);
      break;
    default:
      if (cmd === 'send') {
        if (!sub) die('usage: send <address> [-n 5] [--attach] [--url http://localhost:3000]');
        await send(sub.toLowerCase(), Number(flag('n') ?? 1), !!flags.attach, flag('url') ?? 'http://localhost:3000');
      } else if (cmd === 'seed') {
        await ensureUser('test', { admin: true, display: 'Test User' });
        await ensureMailbox('hello@test.local', 'test', 'Hello');
        await ensureMailbox('support@test.local', 'test', 'Support');
        console.log('seeded user "test" with hello@test.local, support@test.local');
        await send('hello@test.local', 7, 'random', flag('url') ?? 'http://localhost:3000');
        await send('support@test.local', 3, 'random', flag('url') ?? 'http://localhost:3000');
      } else {
        console.log(
          [
            'usage: bun run testcli <command>',
            '  domain add <name> | domain list | domain rm <name>',
            '  user add <name> [--admin] [--display "Name"] | user list',
            '  mailbox add <address> <user> [--label "Label"] | mailbox list',
            '  send <address> [-n 5] [--attach] [--url http://localhost:3000]',
            '  seed',
          ].join('\n'),
        );
      }
  }
} finally {
  await prisma.$disconnect();
}
