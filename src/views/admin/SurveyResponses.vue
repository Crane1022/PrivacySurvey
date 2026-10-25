<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import Pagination from '../../components/ui/Pagination.vue'
import StateBlock from '../../components/common/StateBlock.vue'
import * as admin from '../../services/adminService'

const rows = ref([])
const loading = ref(true)
const error = ref('')
const q = ref('')
const ver = ref('')
const page = ref(1)

async function load() {
  loading.value = true
  error.value = ''
  try { rows.value = await admin.listResponses(200) } catch (e) { error.value = e.message } finally { loading.value = false }
}
onMounted(load)
const versions = computed(() => [...new Set(rows.value.map(r => r.questionnaireVersion))].sort((a, b) => b - a))
const shown = computed(() => rows.value.filter(r => (!ver.value || String(r.questionnaireVersion) === ver.value) && (!q.value || r.responseId?.includes(q.value))))
watch([q, ver], () => { page.value = 1 })
const pageRows = computed(() => shown.value.slice((page.value - 1) * 10, page.value * 10))
const fmt = v => (v ? new Date(v).toLocaleString() : '-')
</script>

<template>
  <div>
    <p class="wp-text">Latest 200 submissions (admin only). Respondent names or emails are not collected. Admin preview submissions are never stored.</p>
    <div class="ad-toolbar">
      <input v-model="q" class="ad-input" style="flex: 1;" placeholder="Search by response ID" aria-label="Search responses" />
      <select v-model="ver" class="ad-input" aria-label="Filter by questionnaire version">
        <option value="">All versions</option><option v-for="v in versions" :key="v" :value="String(v)">Version {{ v }}</option>
      </select>
    </div>
    <StateBlock :loading="loading" :error="error" :empty="!rows.length" empty-text="No responses yet." @retry="load">
      <div class="ad-tablewrap">
        <table class="ad-table">
          <thead><tr><th>Response ID</th><th>Questionnaire</th><th>Answers</th><th>Status</th><th>Submitted</th></tr></thead>
          <tbody>
            <tr v-for="r in pageRows" :key="r.id">
              <td><code>{{ r.responseId }}</code></td>
              <td>v{{ r.questionnaireVersion }}</td>
              <td>{{ Object.keys(r.answers ?? {}).length }}</td>
              <td>{{ r.submissionStatus }}<span v-if="r.isMockData" class="ad-badge b-draft" style="margin-left: 6px;">demo</span></td>
              <td>{{ fmt(r.submittedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination v-model:page="page" :total="shown.length" />
    </StateBlock>
  </div>
</template>
