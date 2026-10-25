<script setup>
import { ref, computed, watch } from 'vue'
import StateBlock from '../common/StateBlock.vue'
import PieChart from '../charts/PieChart.vue'
import BarList from '../charts/BarList.vue'
import HeatmapTable from '../charts/HeatmapTable.vue'
import { config } from '../../config'
import { WPSI_CATEGORIES } from '../../utils/wpsi'
import { WPSI_COLORS } from '../../mock/dashboardMock'
import * as svc from '../../services/dashboardService'

const props = defineProps({ section: { type: String, required: true } })
const data = ref(null)
const loading = ref(true)
const error = ref('')
const survey = ref(null)
const demo = ref(null)

async function load() {
  loading.value = true
  error.value = ''
  data.value = survey.value = demo.value = null
  try {
    const s = props.section
    if (s === 'overview' || s === 'segmentation') data.value = await svc.getOverview()
    else if (s === 'survey') data.value = await svc.getSurveyAnalysis()
    else if (s === 'demographics') data.value = await svc.getDemographics()
    else if (s === 'ml') data.value = await svc.getModelMetrics()
    else if (s === 'clusters') data.value = await svc.getClusters()
    else if (s === 'reports') {
      const [o, d, q] = await Promise.all([svc.getOverview(), svc.getDemographics(), svc.getSurveyAnalysis()])
      data.value = o; demo.value = d; survey.value = q
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
watch(() => props.section, load, { immediate: true })

const pie = computed(() => (data.value?.distribution ?? []).map(d => ({ name: d.category, value: d.count, color: WPSI_COLORS[d.category] ?? '#94A3B8' })))
const total = computed(() => pie.value.reduce((s, d) => s + d.value, 0))
const pct = v => (total.value ? Math.round((v / total.value) * 100) : 0)
const pctMetric = v => (typeof v === 'number' ? (v * 100).toFixed(1) + '%' : '-')
const cats = Object.keys(WPSI_CATEGORIES)

function download(name, rows) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const blob = new Blob([rows.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}
function exportDistribution() {
  download('wpsi-distribution.csv', [['Category', 'Count', 'Percent'], ...data.value.distribution.map(d => [d.category, d.count, pct(d.count)])])
}
function exportDemographics() {
  const rows = [['Group', 'Value', ...cats]]
  for (const g of demo.value.groups) for (const r of g.rows) rows.push([g.name, r.label, ...cats.map(c => r[c] ?? 0)])
  download('wpsi-demographics.csv', rows)
}
function exportSurvey() {
  const rows = [['Question', 'Option', 'Count']]
  for (const q of survey.value.questions) for (const o of q.options) rows.push([q.text, o.label, o.count])
  download('survey-responses-aggregate.csv', rows)
}
</script>

<template>
  <div>
    <div v-if="config.isMock" class="wp-demo" role="note">Sample data for demonstration. Live Mode shows real aggregates from the backend.</div>
    <StateBlock :loading="loading" :error="error" @retry="load">
      <!-- Overview -->
      <template v-if="section === 'overview' && data">
        <div class="ad-grid">
          <div class="ad-stat">Completed surveys<b>{{ data.totalCompleted }}</b></div>
          <div class="ad-stat">Valid responses<b>{{ data.totalValid }}</b></div>
          <div class="ad-stat">Valid share of completed<b>{{ data.totalCompleted ? Math.round((data.totalValid / data.totalCompleted) * 100) + '%' : '-' }}</b></div>
          <div v-for="d in data.distribution" :key="d.category" class="ad-stat">{{ d.category }}<b>{{ d.count }}</b></div>
        </div>
        <div class="wp-card" style="display: flex; gap: 28px; align-items: center; flex-wrap: wrap;">
          <PieChart :data="pie" :size="200" />
          <div>
            <h2 class="wp-title" style="font-size: 18px;">WPSI category distribution</h2>
            <p v-for="d in pie" :key="d.name" class="wp-text" style="margin: 4px 0;"><span :style="{ color: d.color }">●</span> {{ d.name }}: {{ pct(d.value) }}%</p>
          </div>
        </div>
      </template>

      <!-- Segmentation -->
      <template v-else-if="section === 'segmentation' && data">
        <div class="wp-card"><h2 class="wp-title" style="font-size: 18px;">Category comparison</h2><BarList title="Respondents per WPSI category" :items="pie.map(d => ({ label: d.name, value: d.value, color: d.color }))" /></div>
        <div v-for="c in cats" :key="c" class="wp-card" :style="{ borderColor: WPSI_CATEGORIES[c].color }">
          <strong :style="{ color: WPSI_CATEGORIES[c].color }">{{ c }}</strong>
          <p class="wp-text" style="margin: 6px 0 0;">{{ WPSI_CATEGORIES[c].desc }}</p>
        </div>
      </template>

      <!-- Survey analytics -->
      <template v-else-if="section === 'survey' && data">
        <p v-if="!data.questions?.length" class="wp-text">No responses to analyse yet.</p>
        <div v-for="q in data.questions" :key="q.questionId" class="wp-card">
          <h2 class="wp-title" style="font-size: 17px;">{{ q.text }}</h2>
          <BarList :title="q.text" :items="q.options.map(o => ({ label: o.label, value: o.count }))" />
        </div>
      </template>

      <!-- Demographics -->
      <template v-else-if="section === 'demographics' && data">
        <p v-if="!data.groups?.length" class="wp-text">No demographic data yet.</p>
        <div v-for="g in data.groups" :key="g.name" class="wp-card">
          <h2 class="wp-title" style="font-size: 17px;">{{ g.name }} by WPSI category</h2>
          <div v-for="r in g.rows" :key="r.label" style="margin-bottom: 12px;">
            <div style="font-size: 13px; font-weight: 600; margin-bottom: 4px;">{{ r.label }}</div>
            <BarList :title="r.label" :items="cats.map(c => ({ label: c, value: r[c] ?? 0, color: WPSI_COLORS[c] }))" />
          </div>
          <p class="wp-text" style="font-size: 12px;">Aggregated counts only; no individual respondents are shown.</p>
        </div>
      </template>

      <!-- ML -->
      <template v-else-if="section === 'ml' && data">
        <div class="wp-card">
          <p class="wp-text" style="margin: 0;">Model: <strong>{{ data.modelVersion }}</strong> · {{ data.algorithm }}</p>
        </div>
        <div class="ad-grid">
          <div v-for="m in ['accuracy', 'precision', 'recall', 'f1']" :key="m" class="ad-stat" style="text-transform: capitalize;">{{ m === 'f1' ? 'F1-score' : m }}<b>{{ pctMetric(data.metrics?.[m]) }}</b></div>
        </div>
        <div v-if="data.confusionMatrix" class="wp-card"><h2 class="wp-title" style="font-size: 17px;">Confusion matrix</h2><HeatmapTable :labels="data.confusionMatrix.labels" :matrix="data.confusionMatrix.matrix" /></div>
        <div v-if="data.featureImportance?.length" class="wp-card"><h2 class="wp-title" style="font-size: 17px;">Feature importance</h2><BarList title="Feature importance" :items="data.featureImportance.map(f => ({ label: f.feature, value: Number(f.importance.toFixed(3)) }))" /></div>
      </template>

      <!-- Clusters -->
      <template v-else-if="section === 'clusters' && data">
        <p class="wp-text">Supporting K-Means analysis (k = {{ data.k }}). Clusters are not assumed to match the three WPSI categories.</p>
        <div class="wp-card"><BarList title="Cluster sizes" :items="data.clusters.map(c => ({ label: 'Cluster ' + c.id, value: c.size }))" /></div>
        <div v-for="c in data.clusters" :key="c.id" class="wp-card"><strong>Cluster {{ c.id }}</strong><p class="wp-text" style="margin: 6px 0 0;">{{ c.interpretation }}</p></div>
        <p v-if="!data.points" class="wp-text">No 2-D projection has been provided by the ML pipeline yet.</p>
      </template>

      <!-- Reports -->
      <template v-else-if="section === 'reports' && data">
        <div class="wp-card">
          <h2 class="wp-title" style="font-size: 18px;">Export aggregated reports (CSV)</h2>
          <p class="wp-text">Exports contain aggregate counts only.</p>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="wp-btn" @click="exportDistribution">WPSI distribution</button>
            <button class="wp-btn" @click="exportDemographics">Demographic comparison</button>
            <button class="wp-btn" @click="exportSurvey">Question-level responses</button>
          </div>
        </div>
      </template>
    </StateBlock>
  </div>
</template>
