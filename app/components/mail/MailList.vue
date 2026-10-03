<script setup lang="ts">
import type { MailRow } from '~/composables/useMail';

defineProps<{
  mails: MailRow[];
  selectedId: number | null;
  pending: boolean;
  animate: boolean; // false while the whole list is being swapped (category / mailbox)
}>();
defineEmits<{ select: [id: number] }>();

const { t } = useI18n();
const who = (m: MailRow) => (m.direction === 'OUTBOUND' ? t('mail.toRecipient', { to: m.to }) : m.fromName || m.from);
const unread = (m: MailRow) => !m.read && m.direction === 'INBOUND';
</script>

<template>
  <section
    class="flex w-full shrink-0 flex-col overflow-y-auto border-r border-neutral-200 bg-white lg:w-[22rem]"
    :class="{ 'hidden lg:flex': selectedId }"
  >
    <p v-if="!pending && !mails.length" class="px-5 py-12 text-center text-sm text-neutral-400">
      {{ t('mail.nothingHere') }}
    </p>

    <TransitionGroup tag="ul" :name="animate ? 'list' : 'nolist'" class="relative">
      <li v-for="m in mails" :key="m.id" class="border-b border-neutral-100">
        <button
          class="flex w-full flex-col gap-1 px-4 py-3 text-left transition"
          :class="selectedId === m.id ? 'bg-brand-50' : 'hover:bg-neutral-50'"
          @click="$emit('select', m.id)"
        >
          <div class="flex items-center gap-2">
            <span v-if="unread(m)" class="h-2 w-2 shrink-0 bg-brand-600" />
            <Icon v-if="m.starred" name="star" :size="14" :fill="true" class="shrink-0 text-brand-500" />
            <span class="truncate text-sm" :class="{ 'font-semibold': unread(m) }">
              {{ who(m) }}
            </span>
            <span class="ml-auto shrink-0 text-[11px] text-neutral-400">{{ fmtShort(m.receivedAt) }}</span>
          </div>
          <div class="truncate text-sm" :class="{ 'font-medium': unread(m) }">
            {{ m.subject || t('mail.noSubject') }}
          </div>
          <div class="flex items-center gap-1 truncate text-xs text-neutral-400">
            <Icon v-if="m.attachments" name="attach_file" :size="14" />
            <span class="truncate">{{ m.preview || '—' }}</span>
          </div>
        </button>
      </li>
    </TransitionGroup>
  </section>
</template>
