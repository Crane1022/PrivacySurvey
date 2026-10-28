<script setup>
// ML Model & Test Lab: change the test classifier's settings and try it with your own answers.
// Nothing typed into the test answers is saved; only "Save settings" writes to the database.
import { ref, computed, onMounted } from 'vue'
import StateBlock from '../../components/common/StateBlock.vue'
import ConfirmModal from '../../components/common/ConfirmModal.vue'
import ExplanationPanel from '../../components/ml/ExplanationPanel.vue'
import Icon from '../../components/ui/Icon.vue'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import { config as appConfig } from '../../config'
import { MODELS, DEFAULT_MODEL_CONFIG, classify, withDefaults } from '../../ml'
import { concernValue } from '../../ml/features'
import { getModelConfig, saveModelConfig, reclassifyAll } from '../../services/classificationService'
import { getPublishedSurveyConfig, listQuestions } from '../../services/adminService'
import { WPSI_CATEGORIES } from '../../utils/wpsi'

const auth = useAuthStore()
const toast = useToastStore()
const loading = ref(true)
const error = ref('')
const cfg = ref(null)
const savedVersion = ref(0)
const questions = ref([])
const source = ref('')
const answers = ref({})
const saving = ref(false)
const rerun = ref(null) // { done, total } while running
const confirmRerun = ref(false)
const filter = ref('')

const canEdit = computed(() => auth.isAdmin)

async function load() {
  loading.value = true
  error.value = ''
  try {
    cfg.value = JSON.parse(JSON.stringify(await getModelConfig()))
    savedVersion.value = cfg.value.version
    try {
      const pub = await getPublishedSurveyConfig()
      questions.value = pub.questions
      source.value = `published questionnaire v${pub.questionnaireVersion}`
    } catch {
      if (!auth.isAdmin) throw new Error('No questionnaire is published yet, so there are no questions to test.')
      questions.value = (await listQuestions()).filter(q => q.status !== 'archived')
      source.value = 'question bank (no questionnaire published yet)'
    }
    if (!questions.value.length) throw new Error('There are no questions yet. Import the survey first.')
    for (const q of questions.value) cfg.value.questions[q.questionId] ??= { weight: 0, concernEnd: 'first', note: 'Not configured yet' }
    fill('middle')
  } catch (e) { error.value = e.message } finally { loading.value = false }
}
onMounted(load)


// Quick ways to fill the test answers
function fill(kind) {
  const a = {}
  for (const q of questions.value) {
    const n = q.options.length
    if (!n || q.type === 'multiple') continue
    const end = cfg.value.questions[q.questionId]?.concernEnd ?? 'first'
    let i
    if (kind === 'concerned') i = end === 'first' ? 0 : n - 1
    else if (kind === 'unconcerned') i = end === 'first' ? n - 1 : 0
    else if (kind === 'random') i = Math.floor(Math.random() * n)
    else i = Math.floor((n - 1) / 2)
    a[q.questionId] = q.options[i].value
  }
  answers.value = a
}

// Runs on every change: the result updates as you type
const result = computed(() => {
  if (!cfg.value || !questions.value.length) return null
  try { return { ok: true, ...classify({ questions: questions.value, answers: answers.value, config: cfg.value }) } }
  catch (e) { return { ok: false, message: e.message } }
})
const meta = c => WPSI_CATEGORIES[c] ?? { color: '#2C3426', bg: '#EFF2E9' }
const shown = computed(() => {
  const t = filter.value.trim().toLowerCase()
  return questions.value.filter(q => !t || q.questionText.toLowerCase().includes(t) || q.questionId.includes(t) || (q.section ?? '').toLowerCase().includes(t))
})
const unweighted = computed(() => questions.value.filter(q => !(Number(cfg.value.questions[q.questionId]?.weight) > 0)).length)
const concernOf = q => { const c = concernValue(q, answers.value[q.questionId], cfg.value.questions[q.questionId]?.concernEnd); return c == null ? '' : Math.round(c * 100) }
const pct = { get: k => Math.round(cfg.value.thresholds[k] * 100), set: (k, v) => { cfg.value.thresholds[k] = Math.max(0, Math.min(100, Number(v))) / 100 } }
const isCore = id => cfg.value.westinCoreItems.includes(id)
function toggleCore(id) {
  const s = new Set(cfg.value.westinCoreItems)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  cfg.value.westinCoreItems = [...s]
}

async function save() {
  saving.value = true
  try {
    const v = await saveModelConfig(cfg.value)
    cfg.value.version = savedVersion.value = v
    toast.success(`Classifier settings saved (version ${v}). New submissions use them from now on.`)
  } catch (e) { toast.error(e.message) } finally { saving.value = false }
}
function resetDefaults() {
  const keep = cfg.value.version
  cfg.value = JSON.parse(JSON.stringify(withDefaults(DEFAULT_MODEL_CONFIG)))
  cfg.value.version = keep
  toast.success('Defaults loaded. Press "Save settings" to keep them.')
}
async function runAll() {
  confirmRerun.value = false
  rerun.value = { done: 0, total: 0 }
  try {
    const r = await reclassifyAll((done, total) => { rerun.value = { done, total } })
    toast.success(`Re-classified ${r.done} of ${r.total} response(s)${r.failed ? `, ${r.failed} failed` : ''}.`)
  } catch (e) { toast.error(e.message) } finally { rerun.value = null }
}
</script>

<template>
  <StateBlock :loading="loading" :error="error" @retry="load">
    <div v-if="cfg" class="lab">
      <!-- Model settings -->
      <section class="wp-card">
        <div class="head">
          <div>
            <p class="wp-eyebrow" style="margin: 0;">TEST CLASSIFIER · version {{ cfg.version }}<span v-if="cfg.version !== savedVersion"> (unsaved)</span></p>
            <h2 class="wp-title" style="font-size: 20px; margin: 4px 0 0;">{{ MODELS[cfg.activeModel]?.name }}</h2>
          </div>
          <span class="mode" :class="appConfig.classifierMode">{{ appConfig.classifierMode === 'api' ? 'Live results come from the backend API' : 'Live results use this test classifier' }}</span>
        </div>
        <p class="wp-text">{{ MODELS[cfg.activeModel]?.description }}</p>

        <div class="settings">
          <label>
            <span class="wp-label">Model</span>
            <select v-model="cfg.activeModel" class="ad-input" :disabled="!canEdit">
              <option v-for="m in MODELS" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </label>
          <template v-if="cfg.activeModel === 'weighted-score'">
            <label>
              <span class="wp-label">Fundamentalist from score</span>
              <input type="number" min="0" max="100" class="ad-input" :value="pct.get('fundamentalist')" :disabled="!canEdit" @input="pct.set('fundamentalist', $event.target.value)" />
            </label>
            <label>
              <span class="wp-label">Unconcerned up to score</span>
              <input type="number" min="0" max="100" class="ad-input" :value="pct.get('unconcerned')" :disabled="!canEdit" @input="pct.set('unconcerned', $event.target.value)" />
            </label>
          </template>
        </div>
        <p class="wp-text" style="font-size: 13px;">
          Questions from the {{ source }}.
          <span v-if="cfg.activeModel === 'weighted-score' && unweighted"> {{ unweighted }} question(s) have weight 0 and are ignored.</span>
          <span v-if="cfg.activeModel === 'westin-core'"> Tick the core statements in the table (currently {{ cfg.westinCoreItems.length }}).</span>
        </p>
        <div v-if="canEdit" class="btns">
          <button class="wp-btn wp-btn-primary" :disabled="saving" @click="save">{{ saving ? 'Saving…' : 'Save settings' }}</button>
          <button class="wp-btn" @click="resetDefaults">Reset to defaults</button>
          <button class="wp-btn" :disabled="!!rerun" @click="confirmRerun = true">
            {{ rerun ? `Re-classifying ${rerun.done}/${rerun.total}…` : 'Re-run on all saved responses' }}
          </button>
        </div>
        <p v-else class="wp-text" style="font-size: 13px;">Only admins can change the settings. You can still try test answers below.</p>
      </section>

      <div class="cols">
        <!-- Test answers + per-question settings -->
        <section class="wp-card table-card">
          <div class="ad-toolbar" style="margin-bottom: 10px;">
            <strong style="font-size: 15px;">Test answers</strong>
            <span style="flex: 1;"></span>
            <button class="wp-btn ad-mini" @click="fill('concerned')">All most concerned</button>
            <button class="wp-btn ad-mini" @click="fill('middle')">All middle</button>
            <button class="wp-btn ad-mini" @click="fill('unconcerned')">All least concerned</button>
            <button class="wp-btn ad-mini" @click="fill('random')">Random</button>
          </div>
          <input v-model="filter" class="ad-input" style="width: 100%; margin-bottom: 10px;" placeholder="Filter questions by text, id or section" aria-label="Filter questions" />
          <div class="ad-tablewrap">
            <table class="ad-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Test answer</th>
                  <th title="0..100 — how privacy-concerned this answer counts as">Concern</th>
                  <th v-if="cfg.activeModel === 'weighted-score'">Weight</th>
                  <th v-else>Core</th>
                  <th title="Which end of the option list is the MOST privacy-concerned answer">Most-concerned end</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="q in shown" :key="q.questionId" :class="{ off: cfg.activeModel === 'weighted-score' && !(Number(cfg.questions[q.questionId]?.weight) > 0) }">
                  <td class="qcell">
                    <code>{{ q.questionId }}</code>
                    <div :title="q.questionText">{{ q.questionText }}</div>
                    <small v-if="cfg.questions[q.questionId]?.note">{{ cfg.questions[q.questionId].note }}</small>
                  </td>
                  <td>
                    <select v-model="answers[q.questionId]" class="ad-input small" :aria-label="'Test answer for ' + q.questionId">
                      <option v-for="o in q.options" :key="o.value" :value="o.value">{{ o.label }}</option>
                    </select>
                  </td>
                  <td class="num">{{ concernOf(q) }}</td>
                  <td v-if="cfg.activeModel === 'weighted-score'">
                    <input v-model.number="cfg.questions[q.questionId].weight" type="number" min="0" step="0.5" class="ad-input small w" :disabled="!canEdit" :aria-label="'Weight for ' + q.questionId" />
                  </td>
                  <td v-else><input type="checkbox" :checked="isCore(q.questionId)" :disabled="!canEdit" :aria-label="'Westin core item ' + q.questionId" @change="toggleCore(q.questionId)" /></td>
                  <td>
                    <select v-model="cfg.questions[q.questionId].concernEnd" class="ad-input small" :disabled="!canEdit" :aria-label="'Most-concerned end for ' + q.questionId">
                      <option value="first">First: {{ q.options[0]?.label }}</option>
                      <option value="last">Last: {{ q.options[q.options.length - 1]?.label }}</option>
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Live result -->
        <aside class="result">
          <section v-if="result?.ok" class="wp-card res-card" :style="{ background: meta(result.classification).bg }">
            <p class="wp-eyebrow" style="margin: 0;">TEST RESULT</p>
            <p class="cat serif-i" :style="{ color: meta(result.classification).color }">{{ result.classification }}</p>
            <p class="wp-text" style="font-size: 12px; margin: 0;">{{ result.modelVersion }}</p>
          </section>
          <section v-else-if="result" class="wp-card"><p class="wp-error" style="margin: 0;">{{ result.message }}</p></section>
          <section v-if="result?.ok" class="wp-card">
            <h2 class="wp-title" style="font-size: 17px; display: flex; gap: 8px; align-items: center;"><Icon name="sparkle" :size="16" /> Why? (explanation)</h2>
            <ExplanationPanel :explanation="result.explanation" />
          </section>
        </aside>
      </div>

      <ConfirmModal
        v-if="confirmRerun" title="Re-run the model on all responses?" confirm-text="Re-run"
        message="Every saved response is classified again with the settings that are SAVED now (not unsaved changes). Respondents will see the new result and explanation."
        @cancel="confirmRerun = false" @confirm="runAll"
      />
    </div>
  </StateBlock>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: flex-start; }
.mode { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 99px; background: #E6F2EF; color: #0F766E; }
.mode.api { background: #EAF1FA; color: #3B6FB6; }
.settings { display: flex; gap: 12px; flex-wrap: wrap; }
.settings label { display: flex; flex-direction: column; min-width: 170px; }
.btns { display: flex; gap: 8px; flex-wrap: wrap; }
.cols { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 16px; align-items: start; }
.result { position: sticky; top: 76px; }
.res-card { text-align: left; }
.cat { font-size: 32px; line-height: 1.1; margin: 6px 0; }
.qcell { min-width: 220px; max-width: 360px; }
.qcell div { font-size: 13px; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.qcell small { color: var(--ink-soft, #777); font-size: 11px; }
.qcell code { font-size: 11px; }
.small { padding: 6px 8px; font-size: 13px; max-width: 200px; }
.w { width: 72px; }
.num { font-variant-numeric: tabular-nums; text-align: right; }
tr.off td { opacity: .55; }
@media (max-width: 1100px) { .cols { grid-template-columns: 1fr; } .result { position: static; order: -1; } }
</style>
