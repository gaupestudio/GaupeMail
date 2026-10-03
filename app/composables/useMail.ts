export type MailFilter = 'inbox' | 'starred' | 'sent' | 'trash';

export interface Mailbox {
  id: number;
  address: string;
  label: string | null;
  signatureHtml: string | null;
  domain: string;
  owner: { id: number; name: string };
  unread: number;
}

export interface Draft {
  fromId?: number | null;
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  html?: string;
}

export function useMail() {
  const filter = useState<MailFilter>('mail:filter', () => 'inbox');
  const activeMailboxId = useState<number | null>('mail:box', () => null);
  const composeOpen = useState<boolean>('mail:compose', () => false);
  const draft = useState<Draft | null>('mail:draft', () => null);
  const refreshTick = useState<number>('mail:tick', () => 0);
  const bumpRefresh = () => refreshTick.value++;

  const mailboxes = useState<Mailbox[]>('mail:boxes', () => []);

  async function loadMailboxes(force = false) {
    if (force || !mailboxes.value.length) {
      // useRequestFetch (cookie-forwarding) is only valid in setup on the server;
      // client-side calls from event handlers use plain $fetch.
      const fetcher = import.meta.server ? useRequestFetch() : $fetch;
      mailboxes.value = await fetcher('/api/mailboxes');
    }
    if (import.meta.client) {
      const saved = Number(localStorage.getItem('gm:box'));
      if (saved && mailboxes.value.some((b) => b.id === saved)) activeMailboxId.value = saved;
    }
    if (activeMailboxId.value == null && mailboxes.value[0]) {
      activeMailboxId.value = mailboxes.value[0].id;
    }
  }

  const activeMailbox = computed(
    () => mailboxes.value.find((b) => b.id === activeMailboxId.value) ?? null,
  );

  function setMailbox(id: number) {
    activeMailboxId.value = id;
    if (import.meta.client) localStorage.setItem('gm:box', String(id));
  }

  function compose(d: Draft | null = null) {
    draft.value = d;
    composeOpen.value = true;
  }

  return {
    filter,
    activeMailboxId,
    activeMailbox,
    mailboxes,
    composeOpen,
    draft,
    refreshTick,
    bumpRefresh,
    loadMailboxes,
    setMailbox,
    compose,
  };
}
