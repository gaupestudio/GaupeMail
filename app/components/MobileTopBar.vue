<script setup lang="ts">
defineEmits<{ menu: [] }>();
const { compose } = useMail();
</script>

<template>
  <div class="flex items-center gap-2 border-b border-neutral-200 bg-white px-3 py-2.5 lg:hidden">
    <button class="p-1.5 text-neutral-600 hover:bg-neutral-100" @click="$emit('menu')">
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
</template>
