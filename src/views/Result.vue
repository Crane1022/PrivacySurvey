<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getMyOutcome, requestClassification } from '../services/resultService'
import { useAssessmentStore } from '../stores/assessment'
import { useToastStore } from '../stores/toast'
import { WPSI_CATEGORIES } from '../utils/wpsi'
import Icon from '../components/ui/Icon.vue'
import StateBlock from '../components/common/StateBlock.vue'
import DemoBanner from '../components/common/DemoBanner.vue'
import ExplanationPanel from '../components/ml/ExplanationPanel.vue'

const route = useRoute()
const router = useRouter()
const assessment = useAssessmentStore()
const toast = useToastStore()
const isPreviewResult = route.params.id === 'preview'

const outcome = ref(null)
const loading = ref(!isPreviewResult)
const error = ref('')
const busy = ref(false)

async function load() {
  if (isPreviewResult) return
  loading.value = true
  error.value = ''
  try { outcome.value = await getMyOutcome(route.params.id) } catch (e) { error.value = e.message } finally { loading.value = false }
}
onMounted(load)

async function retry() {
  busy.value = true
  try {
    await requestClassification(route.params.id)
    await load()
    if (!outcome.value?.result) toast.error('The result is not ready yet. Please try again shortly.')
  } catch (e) { toast.error(e.message) } finally { busy.value = false }
}
function backToAdmin() {
  assessment.exitPreview()
  router.push({ name: 'admin-questionnaires' })
}
const printReport = () => window.print()
const meta = c => WPSI_CATEGORIES[c] ?? { color: '#2C3426', bg: '#EFF2E9', icon: 'shield', desc: '' }
const fmt = v => (v ? new Date(v).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' }) : '-')
</script>

<template>
  <div class="res">
    <DemoBanner />

    <div v-if="isPreviewResult" class="wp-card">
      <h1 class="wp-title">Preview complete</h1>
      <p class="wp-text">In the live survey, respondents see their saved result here. Preview answers are never saved and no classification is generated.</p>
      <button class="wp-btn wp-btn-primary" @click="backToAdmin">Back to Admin Panel</button>
    </div>

    <StateBlock v-else :loading="loading" :error="error" @retry="load">
      <template v-if="outcome">
        <!-- Saved but not classified yet: never invent a category -->
        <div v-if="!outcome.result" class="wp-card pending rise">
          <p class="wp-eyebrow">ASSESSMENT SAVED</p>
          <h1>Your answers are <span class="serif-i">safely saved.</span></h1>
          <p class="wp-text">
            Your privacy profile has not been generated yet. It appears here once the classification service has processed your answers.
            Saved on {{ fmt(outcome.response.submittedAt) }}.
          </p>
          <div class="acts">
            <button class="wp-btn wp-btn-primary" :disabled="busy" @click="retry">{{ busy ? 'Checking…' : 'Check for my result' }}</button>
            <router-link class="wp-btn" to="/dashboard">Go to dashboard</router-link>
          </div>
        </div>

        <template v-else>
          <p v-if="outcome.result.source === 'browser-test'" class="wp-demo" role="note">Test classifier: this result comes from the project's simple test model, not the final trained model.</p>
          <section class="hero rise" :style="{ background: meta(outcome.result.classification).bg }">
            <span class="ico" :style="{ color: meta(outcome.result.classification).color }"><Icon :name="meta(outcome.result.classification).icon" :size="26" /></span>
            <p class="wp-eyebrow">YOUR WPSI PRIVACY PROFILE</p>
            <h1>Meet your privacy <span class="serif-i">perspective.</span></h1>
            <p class="cat serif-i" :style="{ color: meta(outcome.result.classification).color }">{{ outcome.result.classification }}</p>
            <p class="wp-text">{{ meta(outcome.result.classification).desc }}</p>
            <p class="wp-text" style="font-size: 13px;">This describes an attitude, not a better or worse way to approach privacy.</p>
          </section>

          <div class="cols">
            <section class="wp-card rise" style="--d: .08s">
              <h2>About this result</h2>
              <dl>
                <dt>Assessment date</dt><dd>{{ fmt(outcome.response.submittedAt) }}</dd>
                <dt>Questionnaire version</dt><dd>v{{ outcome.response.questionnaireVersion }}</dd>
                <dt>Questions answered</dt><dd>{{ outcome.response.answers?.length ?? 0 }}</dd>
                <dt>Model version</dt><dd>{{ outcome.result.modelVersion }}</dd>
                <template v-if="outcome.result.confidence != null"><dt>Model confidence</dt><dd>{{ outcome.result.confidence }}</dd></template>
              </dl>
            </section>
            <section class="wp-card rise" style="--d: .14s">
              <h2>What the model looked at</h2>
              <template v-if="outcome.result.explanation">
                <dl>
                  <dt>Questions used</dt><dd>{{ outcome.result.explanation.usedQuestions ?? '-' }}</dd>
                  <template v-if="outcome.result.score != null"><dt>Concern score</dt><dd>{{ Math.round(outcome.result.score * 100) }} / 100</dd></template>
                  <dt>Method</dt><dd>{{ outcome.result.explanation.method === 'rule' ? 'Westin rule' : 'Weighted answers' }}</dd>
                </dl>
              </template>
              <p v-else class="wp-text">An explanation is not available for this result.</p>
            </section>
          </div>

          <section v-if="outcome.result.explanation" class="wp-card rise" style="--d: .18s">
            <h2>Why this result?</h2>
            <ExplanationPanel :explanation="outcome.result.explanation" />
          </section>

          <section class="wp-card rise" style="--d: .2s">
            <h2>Recommendations</h2>
            <ul v-if="outcome.result.recommendations?.length" class="wp-text"><li v-for="r in outcome.result.recommendations" :key="r">{{ r }}</li></ul>
            <p v-else class="wp-text">Privacy awareness recommendations will appear here once the approved recommendation logic is connected.</p>
          </section>
        </template>

        <div class="acts no-print">
          <router-link class="wp-btn" to="/dashboard">View previous results</router-link>
          <button v-if="outcome.result" class="wp-btn" @click="printReport">Download report</button>
        </div>
      </template>
    </StateBlock>
  </div>
</template>

<style scoped>
.res { max-width: 920px; margin: 0 auto; padding: 32px 20px 60px; }
h1 { font-size: clamp(30px, 4.4vw, 48px); font-weight: 500; letter-spacing: -0.03em; line-height: 1.05; margin: 8px 0 12px; }
h1 .serif-i { font-size: 1.08em; }
h2 { font-size: 19px; font-weight: 600; margin: 0 0 12px; letter-spacing: -0.02em; }
.hero { border-radius: 28px; padding: clamp(24px, 4vw, 44px); margin-bottom: 16px; }
.ico { display: inline-flex; width: 52px; height: 52px; border-radius: 16px; background: white; align-items: center; justify-content: center; margin-bottom: 14px; }
.cat { font-size: clamp(34px, 5vw, 56px); margin: 0 0 12px; line-height: 1.05; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; font-size: 14px; }
dt { color: var(--ink-soft); } dd { margin: 0; font-weight: 500; }
.pending { text-align: left; }
.acts { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
@media (max-width: 720px) { .cols { grid-template-columns: 1fr; } }
</style>
