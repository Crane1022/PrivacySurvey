<script setup>
import { useRouter } from 'vue-router'
import { config } from '../../config'
import { useAssessmentStore } from '../../stores/assessment'

const store = useAssessmentStore()
const router = useRouter()
function exit() {
  store.exitPreview()
  router.push({ name: 'admin-questionnaires' })
}
</script>

<template>
  <div v-if="store.isPreview" class="wp-demo" role="note" style="display: flex; gap: 12px; justify-content: space-between; align-items: center; flex-wrap: wrap;">
    <span><strong>Admin preview.</strong> Nothing you enter here is saved or sent to the model.</span>
    <button class="wp-btn ad-mini" @click="exit">Exit preview</button>
  </div>
  <div v-else-if="config.isMock" class="wp-demo" role="note">
    Local test mode: answers are stored only in this browser, not in Firestore.
  </div>
</template>
