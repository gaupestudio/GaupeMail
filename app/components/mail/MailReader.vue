<script setup lang="ts">
import type { MailDetail } from '~/composables/useMail';

defineProps<{
  selectedId: number | null;
  mail: MailDetail | null;
  pending: boolean;
  starBusy: boolean;
}>();
defineEmits<{
  star: [id: number, starred: boolean];
  trash: [id: number];
  restore: [id: number];
  destroy: [id: number];
  close: [];
}>();
</script>

<template>
  <section class="min-w-0 flex-1 overflow-y-auto bg-neutral-50" :class="{ 'hidden lg:block': !selectedId }">
    <div v-if="!selectedId" class="flex h-full items-center justify-center p-10 text-center text-sm text-neutral-400">
      Select a message to read
    </div>

    <Transition name="reveal" mode="out-in">
      <div v-if="pending" key="l" class="p-8 text-sm text-neutral-400">Loading…</div>
      <article v-else-if="mail" :key="mail.id" class="mx-auto max-w-3xl px-4 py-5 sm:px-8 sm:py-8">
        <MailActions
          :mail="mail"
          :star-busy="starBusy"
          @star="(s) => $emit('star', mail!.id, s)"
          @trash="$emit('trash', mail.id)"
          @restore="$emit('restore', mail.id)"
          @destroy="$emit('destroy', mail.id)"
          @close="$emit('close')"
        />

        <h2 class="text-xl font-bold tracking-tight sm:text-2xl">{{ mail.subject || '(no subject)' }}</h2>

        <div class="mt-4 flex items-center gap-3 border-b border-neutral-200 pb-5 text-sm">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-white">
            {{ (mail.fromName || mail.from || '?').slice(0, 1).toUpperCase() }}
          </span>
          <div class="min-w-0">
            <div class="truncate">
              <span class="font-medium">{{ mail.fromName || mail.from }}</span>
              <span v-if="mail.fromName" class="text-neutral-400"> &lt;{{ mail.from }}&gt;</span>
            </div>
            <div class="truncate text-xs text-neutral-400">
              to {{ mail.to }}<span v-if="mail.cc"> · cc {{ mail.cc }}</span> · {{ fmtFull(mail.receivedAt) }}
            </div>
          </div>
        </div>

        <div class="mt-6">
          <HtmlMail v-if="mail.bodyHTML" :html="mail.bodyHTML" />
          <pre v-else class="whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-800">{{ mail.bodyText || '(no content)' }}</pre>
        </div>

        <div v-if="mail.attachments?.length" class="mt-8 flex flex-wrap gap-2">
          <a
            v-for="a in mail.attachments"
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
</template>
