<script setup lang="ts">
const props = withDefaults(
  defineProps<{ name: string; size?: number; fill?: boolean; weight?: number }>(),
  { size: 20, fill: false, weight: 400 },
);
</script>

<template>
  <span
    class="material-symbols-rounded"
    :style="{
      fontSize: props.size + 'px',
      width: props.size + 'px',
      height: props.size + 'px',
      fontVariationSettings: `'FILL' ${props.fill ? 1 : 0}, 'wght' ${props.weight}, 'opsz' ${props.size}`,
    }"
    aria-hidden="true"
  >{{ name }}</span>
</template>
