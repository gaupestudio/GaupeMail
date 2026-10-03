<script setup lang="ts">
import type { MailDetail, MailRow } from '~/composables/useMail';

const { filter, activeMailboxId, refreshTick, loadMailboxes } = useMail();

const titles: Record<string, string> = {
  inbox: 'Inbox',
  starred: 'Starred',
  sent: 'Sent Items',
  spam: 'Spam',
  trash: 'Trash',
};

const { data: mails, pending, refresh } = useAsyncData<MailRow[]>(
  'mails',
  () =>
    activeMailboxId.value
      ? $fetch('/api/mails', { query: { mailboxId: activeMailboxId.value, filter: filter.value } })
      : Promise.resolve([]),
  { watch: [activeMailboxId, filter, refreshTick], default: () => [], lazy: true, deep: true },
);

const selectedId = ref<number | null>(null);
watch([activeMailboxId, filter], () => (selectedId.value = null));

const { data: open, pending: openPending } = useAsyncData<MailDetail | null>(
  'open-mail',
  () => (selectedId.value ? $fetch<MailDetail>(`/api/mails/${selectedId.value}`) : Promise.resolve(null)),
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
async function setSpam(id: number, spam: boolean) {
  actionError.value = null;
  try {
    await $fetch(`/api/mails/${id}`, { method: 'PATCH', body: { spam } });
    if (filter.value === 'inbox' || filter.value === 'spam') dropRow(id);
    else if (open.value && open.value.id === id) open.value = { ...open.value, spam };
    loadMailboxes(true);
  } catch (e) {
    actionError.value = `Couldn't ${spam ? 'mark as spam' : 'move to inbox'}: ${errMsg(e)}`;
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
      <MailList :mails="mails" :selected-id="selectedId" :pending="pending" :animate="listAnim" @select="select" />
      <MailReader
        :selected-id="selectedId"
        :mail="open"
        :pending="openPending"
        :star-busy="starBusy"
        @star="setStar"
        @trash="trash"
        @spam="setSpam"
        @restore="restore"
        @destroy="destroy"
        @close="selectedId = null"
      />
    </div>
  </div>
</template>
