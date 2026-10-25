<script setup>
import { ref, onMounted } from 'vue'
import StateBlock from '../../components/common/StateBlock.vue'
import * as admin from '../../services/adminService'

const loading = ref(true)
const error = ref('')
const s = ref(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [qs, qns, resp, audit, ml, settings] = await Promise.all([
      admin.listQuestions(), admin.listQuestionnaires(), admin.listResponses(500), admin.listAudit(8), admin.getMlSchema(), admin.getSettings(),
    ])
    const published = qns.find(x => x.status === 'published')
    s.value = {
      bank: qs.length, bankPublished: qs.filter(q => q.status === 'published').length,
      published, drafts: qns.filter(x => x.status === 'draft').length,
      responses: resp.length >= 500 ? '500+' : resp.length, audit, ml, settings,
    }
  } catch (e) { error.value = e.message } finally { loading.value = false }
}
onMounted(load)
const fmt = v => (v ? new Date(v).toLocaleString() : '-')
</script>

<template>
  <StateBlock :loading="loading" :error="error" @retry="load">
    <template v-if="s">
      <div class="ad-grid">
        <div class="ad-stat">Published questionnaire<b>{{ s.published ? 'v' + s.published.version : 'None' }}</b></div>
        <div class="ad-stat">Draft questionnaires<b>{{ s.drafts }}</b></div>
        <div class="ad-stat">Questions in bank<b>{{ s.bank }}</b><small class="wp-text">{{ s.bankPublished }} published</small></div>
        <div class="ad-stat">Survey responses<b>{{ s.responses }}</b></div>
        <div class="ad-stat">Survey status<b>{{ s.settings.surveyOpen ? 'Open' : 'Closed' }}</b></div>
        <div class="ad-stat">ML schema<b>{{ s.ml.locked ? 'Locked' : 'Unlocked' }}</b></div>
      </div>
      <div v-if="!s.published" class="wp-error" role="alert">No questionnaire is published, so respondents cannot take the assessment. Go to Questionnaire Management.</div>
      <div class="wp-card">
        <h2 class="wp-title" style="font-size: 18px;">Recent admin activity</h2>
        <p v-if="!s.audit.length" class="wp-text">No activity recorded yet.</p>
        <p v-for="a in s.audit" :key="a.id" class="wp-text" style="margin: 6px 0;"><code>{{ a.action }}</code> · {{ a.actorEmail }} · {{ fmt(a.createdAt) }}</p>
      </div>
    </template>
  </StateBlock>
</template>
