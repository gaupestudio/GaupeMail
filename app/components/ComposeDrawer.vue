<script setup lang="ts">
import type { Mailbox } from '~/composables/useMail';

const props = defineProps<{ mailboxes: Mailbox[]; fromId: number | null }>();
const emit = defineEmits<{ close: []; sent: [] }>();

const { draft } = useMail();
const { t } = useI18n();
const d = draft.value;
draft.value = null; // consume

const fromId = ref(d?.fromId ?? props.fromId ?? props.mailboxes[0]?.id ?? null);
const to = ref(d?.to ?? '');
const cc = ref(d?.cc ?? '');
const bcc = ref(d?.bcc ?? '');
const subject = ref(d?.subject ?? '');
const showCc = ref(!!(d?.cc || d?.bcc));

const mode = ref<'rich' | 'plain'>(d?.html ? 'rich' : 'rich');
const plainBody = ref('');
const editor = ref<HTMLDivElement | null>(null);
const initialHtml = d?.html ?? '';

const sending = ref(false);
const error = ref<string | null>(null);

// --- attachments ---
interface Attach { filename: string; type: string; contentBase64: string; size: number }
const attachments = ref<Attach[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const MAX_TOTAL = 4 * 1024 * 1024;
const totalSize = computed(() => attachments.value.reduce((n, a) => n + a.size, 0));

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement;
  for (const f of Array.from(input.files ?? [])) {
    const b64 = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(',')[1] ?? '');
      r.onerror = () => rej(r.error);
      r.readAsDataURL(f);
    });
    attachments.value.push({
      filename: f.name,
      type: f.type || 'application/octet-stream',
      contentBase64: b64,
      size: f.size,
    });
  }
  input.value = '';
  if (totalSize.value > MAX_TOTAL) error.value = t('compose.errors.tooLarge');
  else error.value = null;
}
const removeAttach = (i: number) => attachments.value.splice(i, 1);

function exec(command: string, value?: string) {
  editor.value?.focus();
  document.execCommand(command, false, value);
}
function addLink() {
  const url = prompt(t('compose.linkUrl'), 'https://');
  if (url) exec('createLink', url);
}

async function send() {
  error.value = null;
  if (!fromId.value) return (error.value = t('compose.errors.pickFrom'));
  if (!to.value.trim()) return (error.value = t('compose.errors.addRecipient'));
  if (!subject.value.trim()) return (error.value = t('compose.errors.addSubject'));

  const payload: Record<string, unknown> = {
    mailboxId: fromId.value,
    to: to.value.trim(),
    subject: subject.value.trim(),
  };
  if (cc.value.trim()) payload.cc = cc.value.trim();
  if (bcc.value.trim()) payload.bcc = bcc.value.trim();

  if (totalSize.value > MAX_TOTAL) return (error.value = t('compose.errors.tooLarge'));
  if (attachments.value.length) {
    payload.attachments = attachments.value.map(({ filename, type, contentBase64 }) => ({
      filename,
      type,
      contentBase64,
    }));
  }

  if (mode.value === 'rich') {
    const html = editor.value?.innerHTML?.trim() ?? '';
    if (!html || html === '<br>') return (error.value = t('compose.errors.writeMessage'));
    payload.html = html;
    payload.text = editor.value?.innerText ?? '';
  } else {
    if (!plainBody.value.trim()) return (error.value = t('compose.errors.writeMessage'));
    payload.text = plainBody.value;
  }

  sending.value = true;
  try {
    await $fetch('/api/send', { method: 'POST', body: payload });
    emit('sent');
    emit('close');
  } catch (e: any) {
    error.value = e?.data?.message || e?.statusMessage || e?.message || t('compose.errors.sendFailed');
  } finally {
    sending.value = false;
  }
}

onMounted(() =>
  nextTick(() => {
    if (editor.value && initialHtml) editor.value.innerHTML = initialHtml;
    editor.value?.focus({ preventScroll: true });
  }),
);

const tools = [
  { c: 'bold', icon: 'format_bold' },
  { c: 'italic', icon: 'format_italic' },
  { c: 'underline', icon: 'format_underlined' },
  { c: 'insertUnorderedList', icon: 'format_list_bulleted' },
];
</script>

<template>
  <div class="flex h-full w-full flex-col bg-white">
    <header class="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
      <h2 class="text-sm font-semibold">{{ t('compose.title') }}</h2>
      <button
        class="p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
        :aria-label="t('compose.close')"
        @click="emit('close')"
      >
        <Icon name="close" :size="20" />
      </button>
    </header>

    <div class="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
      <label class="flex items-center gap-2 text-sm">
        <span class="w-12 shrink-0 text-neutral-400">{{ t('compose.from') }}</span>
        <select v-model="fromId" class="min-w-0 flex-1 border border-neutral-300 px-2 py-1.5 text-sm">
          <option v-for="b in mailboxes" :key="b.id" :value="b.id">
            {{ b.label ? `${b.label} · ${b.address}` : b.address }}
          </option>
        </select>
      </label>

      <div class="flex items-center gap-2 text-sm">
        <span class="w-12 shrink-0 text-neutral-400">{{ t('compose.to') }}</span>
        <input v-model="to" type="text" :placeholder="t('compose.recipientsPlaceholder')"
          class="min-w-0 flex-1 border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        <button v-if="!showCc" class="shrink-0 text-xs text-neutral-400 transition hover:text-neutral-700" @click="showCc = true">
          {{ t('compose.ccBcc') }}
        </button>
      </div>

      <template v-if="showCc">
        <label class="flex items-center gap-2 text-sm">
          <span class="w-12 shrink-0 text-neutral-400">{{ t('compose.cc') }}</span>
          <input v-model="cc" type="text" :placeholder="t('compose.commaSeparated')"
            class="min-w-0 flex-1 border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </label>
        <label class="flex items-center gap-2 text-sm">
          <span class="w-12 shrink-0 text-neutral-400">{{ t('compose.bcc') }}</span>
          <input v-model="bcc" type="text" :placeholder="t('compose.commaSeparated')"
            class="min-w-0 flex-1 border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </label>
      </template>

      <label class="flex items-center gap-2 text-sm">
        <span class="w-12 shrink-0 text-neutral-400">{{ t('compose.subject') }}</span>
        <input v-model="subject" :placeholder="t('compose.subject')"
          class="min-w-0 flex-1 border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
      </label>

      <div class="flex items-center justify-between pt-1.5">
        <div v-if="mode === 'rich'" class="flex gap-0.5">
          <button
            v-for="t in tools"
            :key="t.c"
            class="flex h-8 w-8 items-center justify-center text-neutral-600 transition hover:bg-neutral-100"
            @click="exec(t.c)"
          >
            <Icon :name="t.icon" :size="18" />
          </button>
          <button class="flex h-8 w-8 items-center justify-center text-neutral-600 transition hover:bg-neutral-100" @click="addLink">
            <Icon name="link" :size="18" />
          </button>
        </div>
        <div v-else />
        <div class="flex items-center gap-1">
          <button
            class="flex h-8 w-8 items-center justify-center text-neutral-600 transition hover:bg-neutral-100"
            :title="t('compose.attachFiles')"
            @click="fileInput?.click()"
          >
            <Icon name="attach_file" :size="18" />
          </button>
          <button class="px-2 py-1 text-xs text-neutral-500 transition hover:bg-neutral-100" @click="mode = mode === 'rich' ? 'plain' : 'rich'">
            {{ mode === 'rich' ? t('compose.plainText') : t('compose.richText') }}
          </button>
        </div>
      </div>
      <input ref="fileInput" type="file" multiple class="hidden" @change="onFiles" />

      <ul v-if="attachments.length" class="space-y-1">
        <li
          v-for="(a, i) in attachments"
          :key="i"
          class="flex items-center gap-2 border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-xs"
        >
          <Icon name="attach_file" :size="14" class="shrink-0 text-neutral-400" />
          <span class="min-w-0 flex-1 truncate">{{ a.filename }}</span>
          <span class="shrink-0 text-neutral-400">{{ fmtBytes(a.size) }}</span>
          <button class="shrink-0 text-neutral-400 transition hover:text-brand-600" @click="removeAttach(i)">
            <Icon name="close" :size="14" />
          </button>
        </li>
        <li
          class="px-1 text-[11px]"
          :class="totalSize > MAX_TOTAL ? 'text-brand-600' : 'text-neutral-400'"
        >
          {{ t('compose.sizeOfMax', { size: fmtBytes(totalSize) }) }}
        </li>
      </ul>

      <div
        v-show="mode === 'rich'"
        ref="editor"
        contenteditable="true"
        class="min-h-56 w-full border border-neutral-300 px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 [&_a]:text-brand-600 [&_blockquote]:border-l-2 [&_blockquote]:border-neutral-200 [&_blockquote]:pl-3 [&_blockquote]:text-neutral-500 [&_ul]:list-disc [&_ul]:pl-5"
      />
      <textarea
        v-show="mode === 'plain'"
        v-model="plainBody"
        rows="12"
        :placeholder="t('compose.bodyPlaceholder')"
        class="w-full border border-neutral-300 px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />

      <Transition name="fade">
        <p v-if="error" class="bg-brand-50 px-3 py-2 text-sm text-brand-700">{{ error }}</p>
      </Transition>
    </div>

    <footer class="flex items-center gap-3 border-t border-neutral-200 px-4 py-3">
      <button
        :disabled="sending"
        class="flex items-center gap-1.5 bg-brand-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 active:scale-95 disabled:opacity-50"
        @click="send"
      >
        <Icon name="send" :size="16" />
        {{ sending ? t('compose.sending') : t('compose.send') }}
      </button>
      <button class="text-sm text-neutral-500 transition hover:text-neutral-800" @click="emit('close')">{{ t('compose.discard') }}</button>
    </footer>
  </div>
</template>
