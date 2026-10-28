<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import StateBlock from '../../components/common/StateBlock.vue'
import Pagination from '../../components/ui/Pagination.vue'
import BarList from '../../components/charts/BarList.vue'
import { listAllResults } from '../../services/resultService'
import { WPSI_CATEGORIES } from '../../utils/wpsi'

const rows = ref([])
const loading = ref(true)
const error = ref('')
const category = ref('')
const version = ref('')
const from = ref('')
const to = ref('')
const page = ref(1)

async function load() {
  loading.value = true
  error.value = ''
  try { rows.value = await listAllResults() } catch (e) { error.value = e.message } finally { loading.value = false }
}
onMounted(load)

const versions = computed(() => [...new Set(rows.value.map(r => r.questionnaireVersion).filter(v => v != null))].sort((a, b) => b - a))
const shown = computed(() => rows.value.filter(r => {
  const d = r.createdAt ? new Date(r.createdAt) : null
  return (!category.value || r.classification === category.value)
    && (!version.value || String(r.questionnaireVersion) === version.value)
    && (!from.value || (d && d >= new Date(from.value)))
    && (!to.value || (d && d <= new Date(to.value + 'T23:59:59')))
}))
watch([category, version, from, to], () => { page.value = 1 })
const pageRows = computed(() => shown.value.slice((page.value - 1) * 10, page.value * 10))
// Summary is calculated from the stored rows currently filtered, never from fixed numbers.
const summary = computed(() => Object.keys(WPSI_CATEGORIES).map(c => ({ label: c, value: shown.value.filter(r => r.classification === c).length, color: WPSI_CATEGORIES[c].color })))
const fmt = v => (v ? new Date(v).toLocaleString() : '-')
</script>

<template>
  <div>
    <p class="wp-text">Stored classifications only. Respondents appear as pseudonymous IDs (no names or emails).<span> Rows marked <em>test model</em> come from the test classifier.</span></p>
    <div class="ad-toolbar">
      <select v-model="category" class="ad-input" aria-label="Filter by WPSI category"><option value="">All categories</option><option v-for="(c, n) in WPSI_CATEGORIES" :key="n">{{ n }}</option></select>
      <select v-model="version" class="ad-input" aria-label="Filter by questionnaire version"><option value="">All versions</option><option v-for="v in versions" :key="v" :value="String(v)">Version {{ v }}</option></select>
      <label class="wp-text" style="display: inline-flex; gap: 6px; align-items: center;">From <input v-model="from" type="date" class="ad-input" /></label>
      <label class="wp-text" style="display: inline-flex; gap: 6px; align-items: center;">To <input v-model="to" type="date" class="ad-input" /></label>
    </div>
    <StateBlock :loading="loading" :error="error" :empty="!rows.length" empty-text="No classifications have been stored yet." @retry="load">
      <div class="wp-card"><h2 class="wp-title" style="font-size: 17px;">Category counts ({{ shown.length }} result{{ shown.length === 1 ? '' : 's' }})</h2><BarList title="Results per WPSI category" :items="summary" /></div>
      <div class="ad-tablewrap">
        <table class="ad-table">
          <thead><tr><th>Result</th><th>Respondent</th><th>Category</th><th>Questionnaire</th><th>Model</th><th>Created</th></tr></thead>
          <tbody>
            <tr v-for="r in pageRows" :key="r.id">
              <td><code>{{ (r.resultId ?? r.id).slice(0, 14) }}</code></td><td><code>{{ (r.respondentId ?? '').slice(0, 8) }}…</code></td>
              <td>{{ r.classification }}<span v-if="r?.source === 'browser-test'" class="chip" style="margin-left: 6px;" title="Made by the test classifier, not the final trained model">test model</span></td>
              <td>v{{ r.questionnaireVersion ?? '?' }}</td><td>{{ r.modelVersion }}</td><td>{{ fmt(r.createdAt) }}</td>
            </tr>
            <tr v-if="!shown.length"><td colspan="6" class="wp-text" style="text-align: center;">No results match the filters.</td></tr>
          </tbody>
        </table>
      </div>
      <Pagination v-model:page="page" :total="shown.length" />
    </StateBlock>
  </div>
</template>
