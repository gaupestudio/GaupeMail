<script setup lang="ts">
import type { MailFilter } from '~/composables/useMail';

// open/closed state of the slide-in drawer on mobile (always visible on lg+)
const open = defineModel<boolean>('open', { default: false });

const { user } = useAuth();
const { orgName } = useOrg();
const route = useRoute();
const { filter, activeMailbox, compose } = useMail();

const nav: { key: MailFilter; icon: string }[] = [
  { key: 'inbox', icon: 'inbox' },
  { key: 'starred', icon: 'star' },
  { key: 'sent', icon: 'send' },
  { key: 'spam', icon: 'report' },
  { key: 'trash', icon: 'delete' },
];

const isActive = (f: MailFilter) => route.path === '/' && filter.value === f;
const onSettings = computed(() => route.path.startsWith('/settings'));

function go(f: MailFilter) {
  filter.value = f;
  open.value = false;
  if (route.path !== '/') navigateTo('/');
}
</script>

<template>
  <!-- mobile backdrop -->
  <Transition name="fade">
    <div v-if="open" class="fixed inset-0 z-30 bg-neutral-900/30 lg:hidden" @click="open = false" />
  </Transition>

  <aside
    class="fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-neutral-200 bg-white transition-transform duration-300 lg:static lg:z-0 lg:w-60 lg:translate-x-0"
    :class="open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'"
  >
    <div class="flex items-center gap-2.5 px-5 pb-4 pt-5">
      <span class="flex h-8 w-8 items-center justify-center bg-brand-600 text-sm font-black text-white">G</span>
      <div class="leading-tight">
        <div class="text-[15px] font-bold tracking-tight">GaupeMail</div>
        <div class="truncate text-[11px] text-neutral-400">{{ orgName }}</div>
      </div>
      <button class="ml-auto p-1 text-neutral-400 hover:bg-neutral-100 lg:hidden" @click="open = false">
        <Icon name="close" :size="20" />
      </button>
    </div>

    <div class="px-3 pb-2">
      <button
        class="flex w-full items-center justify-center gap-2 bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700 hover:shadow-md active:scale-[0.98]"
        @click="compose(); open = false"
      >
        <Icon name="edit_square" :size="18" />
        {{ $t('nav.compose') }}
      </button>
    </div>

    <nav class="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
      <button
        v-for="item in nav"
        :key="item.key"
        class="relative flex w-full items-center gap-3 px-3 py-2 text-sm transition"
        :class="isActive(item.key)
          ? 'bg-brand-50 font-semibold text-brand-700'
          : 'text-neutral-600 hover:bg-neutral-100'"
        @click="go(item.key)"
      >
        <span v-if="isActive(item.key)" class="absolute left-0 top-1.5 bottom-1.5 w-1 bg-brand-600" />
        <Icon :name="item.icon" :size="20" :fill="isActive(item.key)" />
        <span class="flex-1 text-left">{{ $t(`nav.${item.key}`) }}</span>
        <span
          v-if="item.key === 'inbox' && activeMailbox?.unread"
          class="bg-brand-600 px-1.5 text-[11px] font-semibold text-white"
        >{{ activeMailbox.unread }}</span>
      </button>

      <NuxtLink
        v-if="user?.isAdmin"
        to="/settings"
        class="mt-2 flex w-full items-center gap-3 px-3 py-2 text-sm transition"
        :class="onSettings
          ? 'bg-brand-50 font-semibold text-brand-700'
          : 'text-neutral-600 hover:bg-neutral-100'"
      >
        <Icon name="settings" :size="20" :fill="onSettings" />
        {{ $t('nav.settings') }}
      </NuxtLink>
    </nav>

    <AccountMenu />
  </aside>
</template>
