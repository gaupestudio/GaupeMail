<script setup lang="ts">
import type { MailFilter } from '~/composables/useMail';

const { user, logout } = useAuth();
const { orgName } = useOrg();
const route = useRoute();
const { filter, activeMailbox, mailboxes, composeOpen, bumpRefresh, loadMailboxes, setMailbox, compose } =
  useMail();

// not awaited — the sidebar fills in when it resolves (no Suspense on the layout)
loadMailboxes().catch(() => {});

const acctOpen = ref(false);
const sidebarOpen = ref(false);
watch(() => route.path, () => (sidebarOpen.value = false));

const nav: { key: MailFilter; label: string; icon: string }[] = [
  { key: 'inbox', label: 'Inbox', icon: 'inbox' },
  { key: 'starred', label: 'Starred', icon: 'star' },
  { key: 'sent', label: 'Sent Items', icon: 'send' },
  { key: 'trash', label: 'Trash', icon: 'delete' },
];

function go(f: MailFilter) {
  filter.value = f;
  acctOpen.value = false;
  sidebarOpen.value = false;
  if (route.path !== '/') navigateTo('/');
}

const initials = computed(() => {
  const n = user.value?.displayName || user.value?.name || '?';
  return n.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join('');
});
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-neutral-50 text-neutral-900">
    <!-- mobile backdrop -->
    <Transition name="fade">
      <div v-if="sidebarOpen" class="fixed inset-0 z-30 bg-neutral-900/30 lg:hidden" @click="sidebarOpen = false" />
    </Transition>

    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-neutral-200 bg-white transition-transform duration-300 lg:static lg:z-0 lg:w-60 lg:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'"
    >
      <div class="flex items-center gap-2.5 px-5 pb-4 pt-5">
        <span class="flex h-8 w-8 items-center justify-center bg-brand-600 text-sm font-black text-white">G</span>
        <div class="leading-tight">
          <div class="text-[15px] font-bold tracking-tight">GaupeMail</div>
          <div class="truncate text-[11px] text-neutral-400">{{ orgName }}</div>
        </div>
        <button class="ml-auto p-1 text-neutral-400 hover:bg-neutral-100 lg:hidden" @click="sidebarOpen = false">
          <Icon name="close" :size="20" />
        </button>
      </div>

      <div class="px-3 pb-2">
        <button
          class="flex w-full items-center justify-center gap-2 bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700 hover:shadow-md active:scale-[0.98]"
          @click="compose(); sidebarOpen = false"
        >
          <Icon name="edit_square" :size="18" />
          Compose
        </button>
      </div>

      <nav class="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        <button
          v-for="item in nav"
          :key="item.key"
          class="relative flex w-full items-center gap-3 px-3 py-2 text-sm transition"
          :class="route.path === '/' && filter === item.key
            ? 'bg-brand-50 font-semibold text-brand-700'
            : 'text-neutral-600 hover:bg-neutral-100'"
          @click="go(item.key)"
        >
          <span
            v-if="route.path === '/' && filter === item.key"
            class="absolute left-0 top-1.5 bottom-1.5 w-1 bg-brand-600"
          />
          <Icon :name="item.icon" :size="20" :fill="route.path === '/' && filter === item.key" />
          <span class="flex-1 text-left">{{ item.label }}</span>
          <span
            v-if="item.key === 'inbox' && activeMailbox?.unread"
            class="bg-brand-600 px-1.5 text-[11px] font-semibold text-white"
          >{{ activeMailbox.unread }}</span>
        </button>

        <NuxtLink
          v-if="user?.isAdmin"
          to="/settings"
          class="mt-2 flex w-full items-center gap-3 px-3 py-2 text-sm transition"
          :class="route.path.startsWith('/settings')
            ? 'bg-brand-50 font-semibold text-brand-700'
            : 'text-neutral-600 hover:bg-neutral-100'"
        >
          <Icon name="settings" :size="20" :fill="route.path.startsWith('/settings')" />
          Settings
        </NuxtLink>
      </nav>

      <!-- Account -->
      <div class="relative border-t border-neutral-200 p-2">
        <Transition name="pop">
          <div
            v-if="acctOpen"
            class="absolute inset-x-2 bottom-full mb-2 overflow-hidden border border-neutral-200 bg-white shadow-xl"
          >
            <div class="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Switch mailbox</div>
            <button
              v-for="b in mailboxes"
              :key="b.id"
              class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-neutral-100"
              :class="{ 'text-brand-700': b.id === activeMailbox?.id }"
              @click="setMailbox(b.id); acctOpen = false"
            >
              <span class="min-w-0">
                <span class="block truncate font-medium">{{ b.label || b.address }}</span>
                <span class="block truncate text-xs text-neutral-400">{{ b.address }}</span>
              </span>
              <span v-if="b.unread" class="bg-brand-600 px-1.5 text-[11px] text-white">{{ b.unread }}</span>
              <Icon v-else-if="b.id === activeMailbox?.id" name="check" :size="16" />
            </button>
            <div class="border-t border-neutral-100">
              <button class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-600 transition hover:bg-neutral-100" @click="logout">
                <Icon name="logout" :size="18" /> Sign out
              </button>
            </div>
          </div>
        </Transition>

        <button
          class="flex w-full items-center gap-2.5 px-2 py-2 text-left transition hover:bg-neutral-100"
          @click="acctOpen = !acctOpen"
        >
          <span class="flex h-8 w-8 shrink-0 items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
            {{ initials }}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium">{{ user?.displayName || user?.name }}</span>
            <span class="block truncate text-xs text-neutral-400">{{ activeMailbox?.label || activeMailbox?.address || 'no mailbox' }}</span>
          </span>
          <Icon name="expand_more" :size="18" class="shrink-0 text-neutral-400 transition" :class="{ 'rotate-180': acctOpen }" />
        </button>
      </div>
    </aside>

    <!-- Main -->
    <div class="relative flex min-w-0 flex-1 flex-col">
      <!-- mobile top bar -->
      <div class="flex items-center gap-2 border-b border-neutral-200 bg-white px-3 py-2.5 lg:hidden">
        <button class="p-1.5 text-neutral-600 hover:bg-neutral-100" @click="sidebarOpen = true">
          <Icon name="menu" :size="22" />
        </button>
        <span class="text-sm font-bold">GaupeMail</span>
        <button
          class="ml-auto flex items-center gap-1 bg-brand-600 px-3 py-1.5 text-sm font-medium text-white active:scale-95"
          @click="compose()"
        >
          <Icon name="edit_square" :size="16" /> New
        </button>
      </div>

      <div class="relative flex min-h-0 flex-1 overflow-hidden">
        <main class="min-w-0 flex-1 overflow-y-auto">
          <slot />
        </main>

        <Transition name="fade">
          <div
            v-if="composeOpen"
            class="absolute inset-0 z-20 bg-neutral-900/20 sm:hidden"
            @click="composeOpen = false"
          />
        </Transition>
        <Transition name="drawer">
          <div
            v-if="composeOpen"
            class="absolute inset-y-0 right-0 z-30 w-full border-l border-neutral-200 bg-white shadow-2xl sm:w-[28rem]"
          >
            <ComposeDrawer
              :mailboxes="mailboxes"
              :from-id="activeMailbox?.id ?? null"
              @close="composeOpen = false"
              @sent="loadMailboxes(true); bumpRefresh()"
            />
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>
