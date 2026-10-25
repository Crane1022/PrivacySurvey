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

function retry() { store.loadConfig() }
function proceed() {
  if (!store.consentGiven) return
  router.push({ name: 'demographics' })
}
</script>

<template>
  <AssessmentShell>
  <div class="wp-page page-enter">
    <DemoBanner />
    <p class="wp-eyebrow">Step 1 · Consent</p>
    <h1 class="wp-title">Privacy information and consent</h1>

    <StateBlock :loading="store.configLoading" :error="store.configError || ''" @retry="retry">
      <div v-if="store.config && store.config.surveyOpen === false" class="wp-card" role="alert">
        <p class="wp-text">This survey is not accepting responses at the moment. Please check back later.</p>
      </div>
      <template v-else>
      <div class="wp-card">
        <!-- PLACEHOLDER WORDING: must be reviewed and approved by the project team and supervisor. -->
        <p class="wp-text"><strong>Purpose.</strong> This academic study (Taylor's University Capstone, Group 19) explores privacy attitudes among Malaysian adult digital service users.</p>
        <p class="wp-text"><strong>What we collect.</strong> Your answers to a short demographic section and a scenario-based questionnaire.</p>
        <p class="wp-text"><strong>How it is used.</strong> Answers are analysed, with a machine learning model, to place you in a privacy attitude category and to produce aggregated research statistics.</p>
        <p class="wp-text"><strong>Voluntary.</strong> Participation is voluntary and you may stop at any time before submitting.</p>
        <p class="wp-text"><strong>Data handling and limits.</strong> Final handling and confidentiality statements are pending approval by the project team and supervisor.</p>
      </div>

      <label class="wp-option" for="consent">
        <input id="consent" type="checkbox" :checked="store.consentGiven" @change="store.setConsent($event.target.checked)" />
        <span>I have read the information above and agree to take part in this research.</span>
      </label>

      <div class="wp-actions">
        <button class="wp-btn" @click="router.push({ name: 'landing' })">Back</button>
        <button class="wp-btn wp-btn-primary" :disabled="!store.consentGiven" @click="proceed">Continue</button>
      </div>
      </template>
    </StateBlock>
  </div>
  </AssessmentShell>
</template>
