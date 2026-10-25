<script setup>
defineProps({
  loading: Boolean,
  error: { type: String, default: '' },
  empty: Boolean,
  emptyText: { type: String, default: 'Nothing to show yet.' },
})
defineEmits(['retry'])
</script>

<template>
  <div v-if="loading" style="text-align: center; padding: 60px 0;" role="status" aria-live="polite">
    <div class="wp-spinner"></div>
    <p class="wp-text">Loading…</p>
  </div>
  <div v-else-if="error" style="text-align: center; padding: 40px 0;" role="alert">
    <p class="wp-error" style="display: inline-block;">{{ error }}</p>
    <div><button class="wp-btn" style="margin-top: 14px;" @click="$emit('retry')">Try again</button></div>
  </div>
  <p v-else-if="empty" class="wp-text" style="text-align: center; padding: 40px 0;">{{ emptyText }}</p>
  <slot v-else />
</template>
