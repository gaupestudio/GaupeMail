<script setup lang="ts">
const props = defineProps<{ html: string }>();
const frame = ref<HTMLIFrameElement | null>(null);
const height = ref(120);

const srcdoc = computed(
  () => `<!doctype html><html><head><meta charset="utf-8">
<base target="_blank">
<style>
  html{color-scheme:light}
  body{margin:0;padding:4px 2px;font:14px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;word-wrap:break-word}
  img{max-width:100%;height:auto}
  a{color:#e11d2e}
  table{max-width:100%}
  blockquote{margin:0 0 0 .8rem;padding-left:.8rem;border-left:3px solid #e5e7eb;color:#6b7280}
</style></head><body>${props.html}</body></html>`,
);

function resize() {
  const doc = frame.value?.contentDocument;
  if (doc?.body) height.value = Math.min(doc.body.scrollHeight + 8, 4000);
}

function onLoad() {
  resize();
  const win = frame.value?.contentWindow;
  const doc = frame.value?.contentDocument;
  if (win && doc && 'ResizeObserver' in win) {
    // @ts-expect-error cross-realm constructor
    const ro = new win.ResizeObserver(() => resize());
    ro.observe(doc.body);
  }
  setTimeout(resize, 300);
}

watch(() => props.html, () => nextTick(resize));
</script>

<template>
  <iframe
    ref="frame"
    :srcdoc="srcdoc"
    sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
    referrerpolicy="no-referrer"
    class="w-full"
    :style="{ height: height + 'px' }"
    @load="onLoad"
  />
</template>
