<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAssessmentStore } from '../stores/assessment'
import AssessmentShell from '../components/ui/AssessmentShell.vue'
import DemoBanner from '../components/common/DemoBanner.vue'
import StateBlock from '../components/common/StateBlock.vue'

const router = useRouter()
const store = useAssessmentStore()
onMounted(() => store.loadConfig())

function labelFor(q) {
  const v = store.answers[q.questionId]
  const vals = Array.isArray(v) ? v : v === undefined ? [] : [v]
  const labels = vals.map(x => q.options.find(o => o.value === x)?.label).filter(Boolean)
  return labels.length ? labels.join(', ') : null
}
function edit(i) {
  store.goTo(i)
  router.push({ name: 'assessment' })
}
async function submit() {
  if (store.unansweredRequired.length) return
  const resultId = await store.submit()
  if (resultId) router.push({ name: 'result', params: { id: resultId } })
}
</script>

<template>
  <AssessmentShell>
  <div class="wp-page page-enter">
    <DemoBanner />
    <p class="wp-eyebrow">Final step</p>
    <h1 class="wp-title">Review your answers</h1>

    <StateBlock :loading="store.configLoading" :error="store.configError || ''" @retry="store.loadConfig()">
      <p v-if="store.unansweredRequired.length" class="wp-error" role="alert">
        {{ store.unansweredRequired.length }} required question(s) still need an answer.
      </p>

      <div v-for="(q, i) in store.questions" :key="q.questionId" class="wp-card" style="margin-top: 14px;">
        <p class="wp-eyebrow">Question {{ i + 1 }}</p>
        <p style="margin: 0 0 8px; font-weight: 600;">{{ q.questionText }}</p>
        <p v-if="labelFor(q)" class="wp-text" style="margin: 0;">{{ labelFor(q) }}</p>
        <p v-else style="margin: 0; color: #B91C1C; font-size: 14px;">Not answered</p>
        <button class="wp-btn" style="margin-top: 12px; padding: 8px 14px;" @click="edit(i)">Edit</button>
      </div>

      <p v-if="store.submitError" class="wp-error" role="alert">{{ store.submitError }}</p>

      <div class="wp-actions">
        <button class="wp-btn" :disabled="store.submitting" @click="edit(store.totalQuestions - 1)">Back</button>
        <button class="wp-btn wp-btn-primary" :disabled="store.submitting || store.unansweredRequired.length > 0" @click="submit">
          {{ store.submitting ? 'Processing…' : 'Submit answers' }}
        </button>
      </div>
    </StateBlock>
  </div>
  </AssessmentShell>
</template>
