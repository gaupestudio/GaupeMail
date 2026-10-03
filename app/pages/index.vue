<script setup lang="ts">
const { filter, activeMailboxId, activeMailbox, refreshTick, loadMailboxes, compose } = useMail();

interface Row {
  id: number;
  direction: 'INBOUND' | 'OUTBOUND';
  from: string;
  fromName: string | null;
  to: string;
  subject: string;
  receivedAt: string;
  read: boolean;
  starred: boolean;
  attachments: number;
  isHtml: boolean;
  preview: string;
}

const titles: Record<string, string> = {
  inbox: 'Inbox',
  starred: 'Starred',
  sent: 'Sent Items',
  trash: 'Trash',
};

const { data: mails, pending, refresh } = useAsyncData<Row[]>(
  'mails',
  () =>
    activeMailboxId.value
      ? $fetch('/api/mails', { query: { mailboxId: activeMailboxId.value, filter: filter.value } })
      : Promise.resolve([]),
  { watch: [activeMailboxId, filter, refreshTick], default: () => [], lazy: true, deep: true },
);

const selectedId = ref<number | null>(null);
watch([activeMailboxId, filter], () => (selectedId.value = null));

const { data: open, pending: openPending } = useAsyncData(
  'open-mail',
  () => (selectedId.value ? $fetch(`/api/mails/${selectedId.value}`) : Promise.resolve(null)),
  { watch: [selectedId], default: () => null, lazy: true, deep: true },
);

// suppress list transitions when the whole list is swapped (category / mailbox)
const listAnim = ref(false);
watch([activeMailboxId, filter], () => (listAnim.value = false));
watch(mails, async () => {
  await nextTick();
  listAnim.value = true;
});

function select(id: number) {
  selectedId.value = id;
  const row = mails.value.find((m) => m.id === id);
  if (row && !row.read) {
    row.read = true;
    setTimeout(() => loadMailboxes(true), 300);
  }
}

const actionError = ref<string | null>(null);
const errMsg = (e: any) =>
  e?.data?.message || e?.data?.statusMessage || e?.statusMessage || e?.message || 'Request failed';

function dropRow(id: number) {
  mails.value = mails.value.filter((x) => x.id !== id);
  if (selectedId.value === id) selectedId.value = null;
}

const starBusy = ref(false);
async function setStar(id: number, starred: boolean) {
  actionError.value = null;
  starBusy.value = true;
  try {
    const res: any = await $fetch(`/api/mails/${id}`, { method: 'PATCH', body: { starred } });
    // reassign (don't mutate) so the change always renders
    if (open.value && open.value.id === id) open.value = { ...open.value, starred: res.starred };
    mails.value = mails.value
      .map((m) => (m.id === id ? { ...m, starred: res.starred } : m))
      .filter((m) => !(filter.value === 'starred' && m.id === id && !res.starred));
  } catch (e) {
    actionError.value = `Couldn't star: ${errMsg(e)}`;
  } finally {
    starBusy.value = false;
  }
}

async function trash(id: number) {
  actionError.value = null;
  try {
    await $fetch(`/api/mails/${id}`, { method: 'DELETE' });
    dropRow(id);
    loadMailboxes(true);
  } catch (e) {
    actionError.value = `Couldn't move to trash: ${errMsg(e)}`;
  }
}
async function restore(id: number) {
  actionError.value = null;
  try {
    await $fetch(`/api/mails/${id}`, { method: 'PATCH', body: { deleted: false } });
    dropRow(id);
  } catch (e) {
    actionError.value = `Couldn't restore: ${errMsg(e)}`;
  }
}
async function destroy(id: number) {
  if (!confirm('Delete this message permanently?')) return;
  actionError.value = null;
  try {
    await $fetch(`/api/mails/${id}?hard=1`, { method: 'DELETE' });
    dropRow(id);
  } catch (e) {
    actionError.value = `Couldn't delete: ${errMsg(e)}`;
  }
}

// --- reply / forward ---
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const splitAddr = (s: string | null | undefined) =>
  (s ?? '')
    .split(',')
    .map((x) => x.trim().replace(/^.*<(.+?)>.*$/, '$1'))
    .filter(Boolean);

function quoteBlock(o: any) {
  const when = new Date(o.receivedAt).toLocaleString();
  const inner = o.bodyHTML || `<div>${escapeHtml(o.bodyText || '').replace(/\n/g, '<br>')}</div>`;
  return `<br><br><blockquote>On ${escapeHtml(when)}, ${escapeHtml(o.fromName || o.from)} wrote:<br><br>${inner}</blockquote>`;
}
function startReply(all = false) {
  const o = open.value as any;
  if (!o) return;
  const mine = (activeMailbox.value?.address || '').toLowerCase();
  const replyTo = o.direction === 'OUTBOUND' ? splitAddr(o.to)[0] || o.to : o.from;
  let cc = '';
  if (all) {
    const pool = [...splitAddr(o.to), ...splitAddr(o.cc)]
      .filter((a) => a.toLowerCase() !== mine && a.toLowerCase() !== replyTo.toLowerCase());
    cc = [...new Set(pool)].join(', ');
  }
  const subject = /^re:/i.test(o.subject) ? o.subject : `Re: ${o.subject}`;
  compose({ fromId: activeMailboxId.value, to: replyTo, cc, subject, html: quoteBlock(o) });
}
function startForward() {
  const o = open.value as any;
  if (!o) return;
  const subject = /^fwd:/i.test(o.subject) ? o.subject : `Fwd: ${o.subject}`;
  compose({ fromId: activeMailboxId.value, subject, html: quoteBlock(o) });
}

const fmtShort = (d: string) => {
  const date = new Date(d);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};
const fmtFull = (d: string) => new Date(d).toLocaleString();
function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}
const who = (m: Row) => (m.direction === 'OUTBOUND' ? `To ${m.to}` : m.fromName || m.from);
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="flex items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3.5 sm:px-5">
      <h1 class="truncate text-lg font-bold tracking-tight">{{ titles[filter] }}</h1>
      <button
        class="flex items-center gap-1.5 border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 transition hover:bg-neutral-50 active:scale-95"
        :disabled="pending"
        @click="refresh()"
      >
        <Icon name="refresh" :size="16" :class="{ 'animate-spin': pending }" />
        <span class="hidden sm:inline">Refresh</span>
      </button>
    </header>

    <Transition name="fade">
      <div
        v-if="actionError"
        class="flex items-center justify-between gap-3 border-b border-brand-200 bg-brand-50 px-5 py-2 text-sm text-brand-700"
      >
        <span>{{ actionError }}</span>
        <button class="text-brand-400 hover:text-brand-700" @click="actionError = null">
          <Icon name="close" :size="16" />
        </button>
      </div>
    </Transition>

    <div class="flex min-h-0 flex-1">
      <!-- List -->
      <section
        class="flex w-full shrink-0 flex-col overflow-y-auto border-r border-neutral-200 bg-white lg:w-[22rem]"
        :class="{ 'hidden lg:flex': selectedId }"
      >
        <p v-if="!pending && !mails.length" class="px-5 py-12 text-center text-sm text-neutral-400">
          Nothing here.
        </p>

        <TransitionGroup tag="ul" :name="listAnim ? 'list' : 'nolist'" class="relative">
          <li v-for="m in mails" :key="m.id" class="border-b border-neutral-100">
            <button
              class="flex w-full flex-col gap-1 px-4 py-3 text-left transition"
              :class="selectedId === m.id ? 'bg-brand-50' : 'hover:bg-neutral-50'"
              @click="select(m.id)"
            >
              <div class="flex items-center gap-2">
                <span v-if="!m.read && m.direction === 'INBOUND'" class="h-2 w-2 shrink-0 bg-brand-600" />
                <Icon v-if="m.starred" name="star" :size="14" :fill="true" class="shrink-0 text-brand-500" />
                <span class="truncate text-sm" :class="{ 'font-semibold': !m.read && m.direction === 'INBOUND' }">
                  {{ who(m) }}
                </span>
                <span class="ml-auto shrink-0 text-[11px] text-neutral-400">{{ fmtShort(m.receivedAt) }}</span>
              </div>
              <div class="truncate text-sm" :class="{ 'font-medium': !m.read && m.direction === 'INBOUND' }">
                {{ m.subject || '(no subject)' }}
              </div>
              <div class="flex items-center gap-1 truncate text-xs text-neutral-400">
                <Icon v-if="m.attachments" name="attach_file" :size="14" />
                <span class="truncate">{{ m.preview || '—' }}</span>
              </div>
            </button>
          </li>
        </TransitionGroup>
      </section>

      <!-- Reading pane -->
      <section class="min-w-0 flex-1 overflow-y-auto bg-neutral-50" :class="{ 'hidden lg:block': !selectedId }">
        <div v-if="!selectedId" class="flex h-full items-center justify-center p-10 text-center text-sm text-neutral-400">
          Select a message to read
        </div>

        <Transition name="reveal" mode="out-in">
          <div v-if="openPending" key="l" class="p-8 text-sm text-neutral-400">Loading…</div>
          <article v-else-if="open" :key="open.id" class="mx-auto max-w-3xl px-4 py-5 sm:px-8 sm:py-8">
            <!-- action toolbar -->
            <div class="mb-5 flex flex-wrap items-center gap-1.5">
              <button class="flex items-center gap-1.5 border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-neutral-50 active:scale-95" @click="startReply(false)">
                <Icon name="reply" :size="16" /> Reply
              </button>
              <button class="flex items-center gap-1.5 border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-neutral-50 active:scale-95" @click="startReply(true)">
                <Icon name="reply_all" :size="16" /> <span class="hidden sm:inline">Reply all</span>
              </button>
              <button class="flex items-center gap-1.5 border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-neutral-50 active:scale-95" @click="startForward">
                <Icon name="forward" :size="16" /> <span class="hidden sm:inline">Forward</span>
              </button>
              <span class="mx-1 h-5 w-px bg-neutral-200" />
              <button
                :disabled="starBusy"
                class="flex items-center gap-1.5 border px-3 py-1.5 text-sm font-medium transition active:scale-95 disabled:opacity-60"
                :class="open.starred
                  ? 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100'
                  : 'border-neutral-300 bg-white hover:bg-neutral-50'"
                @click="setStar(open.id, !open.starred)"
              >
                <Icon name="star" :size="16" :fill="open.starred" />
                {{ open.starred ? 'Starred' : 'Star' }}
              </button>
              <button
                v-if="!open.deleted"
                class="flex items-center gap-1.5 border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-neutral-50 hover:text-brand-600 active:scale-95"
                @click="trash(open.id)"
              >
                <Icon name="delete" :size="16" /> <span class="hidden sm:inline">Trash</span>
              </button>
              <template v-else>
                <button class="flex items-center gap-1.5 border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-neutral-50 active:scale-95" @click="restore(open.id)">
                  <Icon name="restore_from_trash" :size="16" /> Restore
                </button>
                <button class="flex items-center gap-1.5 border border-brand-200 bg-white px-3 py-1.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50 active:scale-95" @click="destroy(open.id)">
                  <Icon name="delete_forever" :size="16" /> Delete forever
                </button>
              </template>
              <button class="ml-auto flex items-center p-1.5 text-neutral-400 transition hover:bg-neutral-100 lg:hidden" @click="selectedId = null">
                <Icon name="close" :size="20" />
              </button>
            </div>

            <h2 class="text-xl font-bold tracking-tight sm:text-2xl">{{ open.subject || '(no subject)' }}</h2>

            <div class="mt-4 flex items-center gap-3 border-b border-neutral-200 pb-5 text-sm">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-white">
                {{ (open.fromName || open.from || '?').slice(0, 1).toUpperCase() }}
              </span>
              <div class="min-w-0">
                <div class="truncate">
                  <span class="font-medium">{{ open.fromName || open.from }}</span>
                  <span v-if="open.fromName" class="text-neutral-400"> &lt;{{ open.from }}&gt;</span>
                </div>
                <div class="truncate text-xs text-neutral-400">
                  to {{ open.to }}<span v-if="open.cc"> · cc {{ open.cc }}</span> · {{ fmtFull(open.receivedAt) }}
                </div>
              </div>
            </div>

            <div class="mt-6">
              <HtmlMail v-if="open.bodyHTML" :html="open.bodyHTML" />
              <pre v-else class="whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-800">{{ open.bodyText || '(no content)' }}</pre>
            </div>

            <div v-if="open.attachments?.length" class="mt-8 flex flex-wrap gap-2">
              <a
                v-for="a in open.attachments"
                :key="a.id"
                :href="`/api/attachments/${a.id}`"
                download
                class="flex items-center gap-2 border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                <Icon name="download" :size="16" class="text-neutral-400" />
                {{ a.filename }}
                <span class="text-neutral-400">{{ fmtBytes(a.size) }}</span>
              </a>
            </div>
          </article>
        </Transition>
      </section>
    </div>
  </div>
</template>
