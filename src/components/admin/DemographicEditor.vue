<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { DEMOGRAPHIC_TYPES, validateDemographic } from '../../utils/questions'

const props = defineProps({ field: { type: Object, required: true }, isNew: Boolean, saving: Boolean })
const emit = defineEmits(['save', 'cancel'])
const f = ref(JSON.parse(JSON.stringify(props.field)))
const errors = ref([])

function addOption() {
  const used = f.value.options.map(o => Number(String(o.value).split('-o').pop())).filter(Number.isFinite)
  f.value.options.push({ value: `${f.value.id}-o${(used.length ? Math.max(...used) : 0) + 1}`, label: '' })
}
function move(i, d) {
  const j = i + d, o = f.value.options
  if (j < 0 || j >= o.length) return
  ;[o[i], o[j]] = [o[j], o[i]]
}
function submit() {
  errors.value = validateDemographic(f.value)
  if (!errors.value.length) emit('save', f.value)
}
const onKey = e => { if (e.key === 'Escape' && !props.saving) emit('cancel') }
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="ad-modalbg">
    <form class="ad-modal" role="dialog" aria-modal="true" aria-label="Demographic field editor" novalidate @submit.prevent="submit">
      <h2 class="wp-title" style="font-size: 22px;">{{ isNew ? 'Add demographic field' : 'Edit demographic field' }}</h2>
      <p class="wp-text" style="font-size: 13px;">Collect only what the approved research design requires. Respondent names and emails are never collected.</p>
      <label class="wp-label" for="dl">Field label *</label>
      <input id="dl" v-model="f.label" class="ad-input" style="width: 100%; margin-bottom: 12px;" />
      <div class="ad-row2" style="margin-bottom: 12px;">
        <div>
          <label class="wp-label" for="dt">Input type</label>
          <select id="dt" v-model="f.type" class="ad-input" style="width: 100%;"><option v-for="(l, k) in DEMOGRAPHIC_TYPES" :key="k" :value="k">{{ l }}</option></select>
        </div>
        <div>
          <label class="wp-label" for="do">Display order</label>
          <input id="do" v-model.number="f.order" type="number" min="1" class="ad-input" style="width: 100%;" />
        </div>
      </div>
      <div class="ad-row2" style="margin-bottom: 12px;">
        <div>
          <label class="wp-label" for="ds">Status</label>
          <select id="ds" v-model="f.status" class="ad-input" style="width: 100%;">
            <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
          </select>
        </div>
        <label class="wp-option" style="margin: 22px 0 0;"><input v-model="f.required" type="checkbox" /><span>Required</span></label>
      </div>
      <span class="wp-label">Options</span>
      <div v-for="(o, i) in f.options" :key="o.value" style="display: flex; gap: 6px; margin-bottom: 6px;">
        <input v-model="o.label" class="ad-input" style="flex: 1;" :aria-label="'Option ' + (i + 1)" />
        <label class="wp-text" style="display: flex; gap: 4px; align-items: center; font-size: 12px; margin: 0; white-space: nowrap;" title="Show a text box when this option is chosen">
          <input v-model="o.other" type="checkbox" /> text box
        </label>
        <button type="button" class="wp-btn ad-mini" aria-label="Move up" @click="move(i, -1)">↑</button>
        <button type="button" class="wp-btn ad-mini" aria-label="Move down" @click="move(i, 1)">↓</button>
        <button type="button" class="wp-btn ad-mini ad-danger" aria-label="Remove option" :disabled="f.options.length <= 2" @click="f.options.splice(i, 1)">✕</button>
      </div>
      <button type="button" class="wp-btn ad-mini" @click="addOption">+ Add option</button>
      <p v-for="e in errors" :key="e" class="wp-error" role="alert">{{ e }}</p>
      <div class="wp-actions">
        <button type="button" class="wp-btn" :disabled="saving" @click="emit('cancel')">Cancel</button>
        <button type="submit" class="wp-btn wp-btn-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save field' }}</button>
      </div>
    </form>
  </div>
</template>
