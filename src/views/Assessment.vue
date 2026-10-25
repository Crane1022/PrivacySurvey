<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAssessmentStore } from '../stores/assessment'
import AssessmentShell from '../components/ui/AssessmentShell.vue'
import DemoBanner from '../components/common/DemoBanner.vue'
import StateBlock from '../components/common/StateBlock.vue'
import QuestionInput from '../components/common/QuestionInput.vue'
import { isAnswered } from '../utils/questions'

const router = useRouter()
const store = useAssessmentStore()
onMounted(() => store.loadConfig())

function canAdvance() {
  const q = store.currentQuestion
  return !q || !q.isRequired || isAnswered(q, store.answers[q.questionId])
}
function next() {
  if (!canAdvance()) return
  if (store.currentIndex >= store.totalQuestions - 1) router.push({ name: 'review' })
  else store.goTo(store.currentIndex + 1)
}
function back() {
  if (store.currentIndex === 0) router.push({ name: 'demographics' })
  else store.goTo(store.currentIndex - 1)
}
</script>

<template>
  <AssessmentShell>
  <div class="wp-page page-enter">
    <DemoBanner />
    <StateBlock
      :loading="store.configLoading"
      :error="store.configError || ''"
      :empty="!!store.config && store.totalQuestions === 0"
      empty-text="No questions are available yet."
      @retry="store.loadConfig()"
    >
      <template v-if="store.currentQuestion">
        <p class="wp-eyebrow">{{ store.currentQuestion.section }}</p>
        <p class="wp-text" style="margin: 0 0 8px; font-weight: 600;">
          Question {{ String(store.currentIndex + 1).padStart(2, '0') }} of {{ String(store.totalQuestions).padStart(2, '0') }}
        </p>
        <div
          class="wp-progress" role="progressbar" aria-label="Questionnaire progress"
          :aria-valuenow="store.currentIndex + 1" aria-valuemin="1" :aria-valuemax="store.totalQuestions"
        >
          <div :style="{ width: ((store.currentIndex + 1) / store.totalQuestions) * 100 + '%' }"></div>
        </div>

        <div :key="store.currentQuestion.questionId" class="card-enter" style="margin-top: 24px;">
          <QuestionInput
            :question="store.currentQuestion"
            :model-value="store.answers[store.currentQuestion.questionId]"
            @update:model-value="store.setAnswer(store.currentQuestion.questionId, $event)"
          />
        </div>

        <div class="wp-actions">
          <button class="wp-btn" @click="back">Previous</button>
          <button class="wp-btn wp-btn-primary" :disabled="!canAdvance()" @click="next">
            {{ store.currentIndex >= store.totalQuestions - 1 ? 'Review answers' : 'Continue →' }}
          </button>
        </div>
      </template>
    </StateBlock>
  </div>
  </AssessmentShell>
</template>
