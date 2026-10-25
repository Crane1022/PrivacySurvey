<script setup>
import { computed } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({ page: { type: Number, required: true }, total: { type: Number, required: true }, pageSize: { type: Number, default: 10 } })
const emit = defineEmits(['update:page'])
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const from = computed(() => (props.total ? (props.page - 1) * props.pageSize + 1 : 0))
const to = computed(() => Math.min(props.total, props.page * props.pageSize))
</script>

<template>
  <div v-if="total > pageSize" class="pg" role="navigation" aria-label="Pagination">
    <span class="info">{{ from }}–{{ to }} of {{ total }}</span>
    <button class="wp-btn ad-mini" :disabled="page <= 1" aria-label="Previous page" @click="emit('update:page', page - 1)"><Icon name="left" :size="14" /></button>
    <span class="info" aria-current="page">Page {{ page }} / {{ pages }}</span>
    <button class="wp-btn ad-mini" :disabled="page >= pages" aria-label="Next page" @click="emit('update:page', page + 1)"><Icon name="right" :size="14" /></button>
  </div>
</template>

<style scoped>
.pg { display: flex; gap: 10px; align-items: center; justify-content: flex-end; margin-top: 12px; }
.info { font-size: 13px; color: var(--color-text-secondary); }
</style>
