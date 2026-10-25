<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import QuestionInput from '../common/QuestionInput.vue'
import ConfirmModal from '../common/ConfirmModal.vue'
import { QUESTION_TYPES, validateQuestion, likertOptions, nextOptionValue } from '../../utils/questions'

const props = defineProps({
  question: { type: Object, required: true },
  isNew: Boolean,
  enabledTypes: { type: Array, required: true },
  saving: Boolean,
})
const emit = defineEmits(['save', 'cancel'])

const original = JSON.parse(JSON.stringify(props.question))
const f = ref(JSON.parse(JSON.stringify(props.question)))
const errors = ref([])
const confirmSig = ref(false)
const previewAnswer = ref(undefined)

const types = computed(() => Object.entries(QUESTION_TYPES).filter(([k]) => props.enabledTypes.includes(k) || k === original.type))

function onType() {
  previewAnswer.value = undefined
  if (f.value.type === 'likert' && f.value.options.every(o => !o.label.trim())) f.value.options = likertOptions(f.value.questionId)
}
function addOption() { f.value.options.push({ value: nextOptionValue(f.value.questionId, f.value.options), label: '' }) }
function removeOption(i) { f.value.options.splice(i, 1) }
function move(i, d) {
  const j = i + d
  if (j < 0 || j >= f.value.options.length) return
  const o = f.value.options
  ;[o[i], o[j]] = [o[j], o[i]]
}

const significant = computed(() => {
  if (props.isNew) return false
  const removed = original.options.some(o => !f.value.options.find(n => n.value === o.value))
  return removed || original.type !== f.value.type
})
function submit() {
  errors.value = validateQuestion(f.value, props.enabledTypes)
  if (errors.value.length) return
  if (significant.value && !confirmSig.value) { confirmSig.value = true; return }
  emit('save', f.value)
}
const onKey = e => { if (e.key === 'Escape' && !confirmSig.value && !props.saving) emit('cancel') }
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="ad-modalbg">
    <form class="ad-modal wide" role="dialog" aria-modal="true" aria-label="Question editor" novalidate @submit.prevent="submit">
      <h2 class="wp-title" style="font-size: 22px;">{{ isNew ? 'Add question' : 'Edit question' }}</h2>
      <div class="ad-row2">
        <div>
          <p class="wp-text" style="margin: 0 0 12px;">Question ID: <code>{{ f.questionId }}</code> (generated)</p>
          <label class="wp-label" for="qt">Question title *</label>
          <input id="qt" v-model="f.questionText" class="ad-input" style="width: 100%; margin-bottom: 12px;" />
          <label class="wp-label" for="qs">Scenario description</label>
          <textarea id="qs" v-model="f.scenario" class="ad-input" rows="3" style="width: 100%; margin-bottom: 12px;"></textarea>
          <label class="wp-label" for="qsec">Section (optional)</label>
          <input id="qsec" v-model="f.section" class="ad-input" style="width: 100%; margin-bottom: 12px;" />
          <div class="ad-row2" style="margin-bottom: 12px;">
            <div>
              <label class="wp-label" for="qtype">Question type</label>
              <select id="qtype" v-model="f.type" class="ad-input" style="width: 100%;" @change="onType">
                <option v-for="[k, t] in types" :key="k" :value="k">{{ t.label }}</option>
              </select>
            </div>
            <div>
              <label class="wp-label" for="qord">Display order</label>
              <input id="qord" v-model.number="f.order" type="number" min="1" class="ad-input" style="width: 100%;" />
            </div>
          </div>
          <div class="ad-row2" style="margin-bottom: 12px;">
            <div>
              <label class="wp-label" for="qstat">Status</label>
              <select id="qstat" v-model="f.status" class="ad-input" style="width: 100%;">
                <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
              </select>
            </div>
            <label class="wp-option" style="margin: 22px 0 0;"><input v-model="f.isRequired" type="checkbox" /><span>Required</span></label>
          </div>

          <span class="wp-label">Answer options</span>
          <div v-for="(o, i) in f.options" :key="o.value" style="display: flex; gap: 6px; margin-bottom: 6px;">
            <input v-model="o.label" class="ad-input" style="flex: 1;" :aria-label="'Option ' + (i + 1)" />
            <button type="button" class="wp-btn ad-mini" aria-label="Move up" @click="move(i, -1)">↑</button>
            <button type="button" class="wp-btn ad-mini" aria-label="Move down" @click="move(i, 1)">↓</button>
            <button type="button" class="wp-btn ad-mini ad-danger" aria-label="Remove option" :disabled="f.options.length <= 2" @click="removeOption(i)">✕</button>
          </div>
          <button type="button" class="wp-btn ad-mini" @click="addOption">+ Add option</button>
        </div>

        <div>
          <span class="wp-label">Preview</span>
          <QuestionInput v-model="previewAnswer" :question="{ ...f, questionText: f.questionText || 'Your question title', options: f.options.map(o => ({ ...o, label: o.label || '…' })) }" />
          <p class="wp-text" style="font-size: 13px;">Editing a bank question does not change published questionnaires: they keep their own copy. Changes take effect in the next questionnaire version you publish.</p>
        </div>
      </div>

      <p v-for="e in errors" :key="e" class="wp-error" role="alert">{{ e }}</p>
      <div class="wp-actions">
        <button type="button" class="wp-btn" :disabled="saving" @click="emit('cancel')">Cancel</button>
        <button type="submit" class="wp-btn wp-btn-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save question' }}</button>
      </div>
    </form>

    <ConfirmModal
      v-if="confirmSig" title="Significant change" confirm-text="Save anyway" danger
      message="You removed answer options or changed the question type. This can affect how new responses are analysed and whether the ML schema stays compatible. Continue?"
      @cancel="confirmSig = false" @confirm="confirmSig = false; emit('save', f)"
    />
  </div>
</template>
