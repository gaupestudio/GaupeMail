<script setup lang="ts">
import type { MailDetail } from '~/composables/useMail';

const props = defineProps<{ mail: MailDetail; starBusy: boolean }>();
const emit = defineEmits<{
  star: [starred: boolean];
  trash: [];
  spam: [spam: boolean];
  restore: [];
  destroy: [];
  close: [];
}>();

const { activeMailboxId, activeMailbox, compose } = useMail();

function reply(all = false) {
  const o = props.mail;
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

function forward() {
  const o = props.mail;
  const subject = /^fwd:/i.test(o.subject) ? o.subject : `Fwd: ${o.subject}`;
  compose({ fromId: activeMailboxId.value, subject, html: quoteBlock(o) });
}

const btn =
  'flex items-center gap-1.5 border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-neutral-50 active:scale-95';
</script>

<template>
  <div class="mb-5 flex flex-wrap items-center gap-1.5">
    <button :class="btn" @click="reply(false)">
      <Icon name="reply" :size="16" /> Reply
    </button>
    <button :class="btn" @click="reply(true)">
      <Icon name="reply_all" :size="16" /> <span class="hidden sm:inline">Reply all</span>
    </button>
    <button :class="btn" @click="forward">
      <Icon name="forward" :size="16" /> <span class="hidden sm:inline">Forward</span>
    </button>
    <span class="mx-1 h-5 w-px bg-neutral-200" />
    <button
      :disabled="starBusy"
      class="flex items-center gap-1.5 border px-3 py-1.5 text-sm font-medium transition active:scale-95 disabled:opacity-60"
      :class="mail.starred
        ? 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100'
        : 'border-neutral-300 bg-white hover:bg-neutral-50'"
      @click="emit('star', !mail.starred)"
    >
      <Icon name="star" :size="16" :fill="mail.starred" />
      {{ mail.starred ? 'Starred' : 'Star' }}
    </button>
    <button
      v-if="mail.direction === 'INBOUND' && !mail.deleted"
      :class="btn"
      :title="mail.spamScore != null ? `SpamAssassin score ${mail.spamScore}` : undefined"
      @click="emit('spam', !mail.spam)"
    >
      <template v-if="mail.spam">
        <Icon name="move_to_inbox" :size="16" /> Not spam
      </template>
      <template v-else>
        <Icon name="report" :size="16" /> <span class="hidden sm:inline">Spam</span>
      </template>
    </button>
    <button v-if="!mail.deleted" :class="[btn, 'hover:text-brand-600']" @click="emit('trash')">
      <Icon name="delete" :size="16" /> <span class="hidden sm:inline">Trash</span>
    </button>
    <template v-else>
      <button :class="btn" @click="emit('restore')">
        <Icon name="restore_from_trash" :size="16" /> Restore
      </button>
      <button
        class="flex items-center gap-1.5 border border-brand-200 bg-white px-3 py-1.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50 active:scale-95"
        @click="emit('destroy')"
      >
        <Icon name="delete_forever" :size="16" /> Delete forever
      </button>
    </template>
    <button class="ml-auto flex items-center p-1.5 text-neutral-400 transition hover:bg-neutral-100 lg:hidden" @click="emit('close')">
      <Icon name="close" :size="20" />
    </button>
  </div>
</template>
