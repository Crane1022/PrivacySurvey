<script setup>
import { computed } from 'vue'
const props = defineProps({
  items: { type: Array, required: true }, // [{ label, value, color? }]
  color: { type: String, default: '#0F766E' },
  title: { type: String, default: '' },
})
const max = computed(() => Math.max(1, ...props.items.map(i => i.value)))
</script>

<template>
  <figure style="margin: 0;" role="img" :aria-label="title + ': ' + items.map(i => i.label + ' ' + i.value).join(', ')">
    <div v-for="i in items" :key="i.label" class="ad-bar">
      <span>{{ i.label }}</span>
      <div><i :style="{ width: (i.value / max) * 100 + '%', background: i.color || color }"></i></div>
      <span style="width: 44px; text-align: right;">{{ i.value }}</span>
    </div>
  </figure>
</template>
