<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
const props = defineProps({
  title: String, message: String, confirmText: { type: String, default: 'Confirm' },
  danger: Boolean, busy: Boolean,
})
const emit = defineEmits(['confirm', 'cancel'])
const onKey = e => { if (e.key === 'Escape' && !props.busy) emit('cancel') }
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="ad-modalbg" @click.self="!busy && emit('cancel')">
    <div class="ad-modal" style="max-width: 460px;" role="dialog" aria-modal="true" :aria-label="title">
      <h2 class="wp-title" style="font-size: 20px;">{{ title }}</h2>
      <p class="wp-text" style="white-space: pre-line;">{{ message }}</p>
      <slot />
      <div class="wp-actions">
        <button class="wp-btn" :disabled="busy" @click="emit('cancel')">Cancel</button>
        <button class="wp-btn" :class="danger ? 'ad-danger' : 'wp-btn-primary'" :disabled="busy" @click="emit('confirm')">
          {{ busy ? 'Working…' : confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>
