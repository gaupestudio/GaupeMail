<script setup lang="ts">
// Bottom-of-sidebar user button with the mailbox switcher / sign-out popover.
const { user, logout } = useAuth();
const { activeMailbox, mailboxes, setMailbox, filter } = useMail();

const { locale, locales, setLocale } = useI18n();

const menuOpen = ref(false);
watch(filter, () => (menuOpen.value = false));

// dot on the avatar when a different mailbox has unread mail
const otherUnread = computed(() =>
  mailboxes.value.some((b) => b.id !== activeMailbox.value?.id && (b.unread || b.spamUnread)),
);

const initials = computed(() => {
  const n = user.value?.displayName || user.value?.name || '?';
  return n.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join('');
});
</script>

<template>
  <div class="relative border-t border-neutral-200 p-2">
    <Transition name="pop">
      <div
        v-if="menuOpen"
        class="absolute inset-x-2 bottom-full mb-2 overflow-hidden border border-neutral-200 bg-white shadow-xl"
      >
        <div class="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{{ $t('account.switchMailbox') }}</div>
        <button
          v-for="b in mailboxes"
          :key="b.id"
          class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-neutral-100"
          :class="{ 'text-brand-700': b.id === activeMailbox?.id }"
          @click="setMailbox(b.id); menuOpen = false"
        >
          <span class="min-w-0">
            <span class="block truncate font-medium">{{ b.label || b.address }}</span>
            <span class="block truncate text-xs text-neutral-400">{{ b.address }}</span>
          </span>
          <span class="flex shrink-0 items-center gap-1">
            <span v-if="b.unread" class="bg-brand-600 px-1.5 text-[11px] text-white" :title="$t('nav.inbox')">{{ b.unread }}</span>
            <span v-if="b.spamUnread" class="bg-red-600 px-1.5 text-[11px] text-white" :title="$t('nav.spam')">{{ b.spamUnread }}</span>
            <Icon v-if="!b.unread && !b.spamUnread && b.id === activeMailbox?.id" name="check" :size="16" />
          </span>
        </button>
        <div class="border-t border-neutral-100">
          <label class="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600">
            <Icon name="language" :size="18" />
            <span class="sr-only">{{ $t('account.language') }}</span>
            <select
              :value="locale"
              class="min-w-0 flex-1 border border-neutral-300 bg-white px-2 py-1 text-sm"
              @change="setLocale(($event.target as HTMLSelectElement).value as typeof locale)"
            >
              <option v-for="l in locales" :key="l.code" :value="l.code">{{ l.name }}</option>
            </select>
          </label>
          <button class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-600 transition hover:bg-neutral-100" @click="logout">
            <Icon name="logout" :size="18" /> {{ $t('account.signOut') }}
          </button>
        </div>
      </div>
    </Transition>

    <button
      class="flex w-full items-center gap-2.5 px-2 py-2 text-left transition hover:bg-neutral-100"
      @click="menuOpen = !menuOpen"
    >
      <span class="relative flex h-8 w-8 shrink-0 items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
        {{ initials }}
        <span v-if="otherUnread" class="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-600" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-medium">{{ user?.displayName || user?.name }}</span>
        <span class="block truncate text-xs text-neutral-400">{{ activeMailbox?.label || activeMailbox?.address || $t('account.noMailbox') }}</span>
      </span>
      <Icon name="expand_more" :size="18" class="shrink-0 text-neutral-400 transition" :class="{ 'rotate-180': menuOpen }" />
    </button>
  </div>
</template>
