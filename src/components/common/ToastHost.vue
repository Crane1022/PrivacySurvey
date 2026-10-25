<script setup>
import { useToastStore } from '../../stores/toast'
const toasts = useToastStore()
</script>

<template>
  <div class="ad-toasts" role="status" aria-live="polite">
    <div v-for="t in toasts.items" :key="t.id" class="ad-toast" :class="t.type" @click="toasts.dismiss(t.id)">{{ t.message }}</div>
  </div>
</template>
