<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import QuestionInput from '../../components/common/QuestionInput.vue'
import Icon from '../../components/ui/Icon.vue'
import { useToastStore } from '../../stores/toast'
import * as admin from '../../services/adminService'
import { getModelConfig } from '../../services/classificationService'
import { parseImportFile, applyImport } from '../../import/importService'
import { finalizeModel } from '../../import/model'
import { modelToCsv } from '../../import/csv'
import { QUESTION_TYPES, DEMOGRAPHIC_TYPES } from '../../utils/questions'

const router = useRouter()
const toast = useToastStore()

const fileName = ref('')
const raw = ref(null) // parsed, editable
const parseError = ref('')
const parsing = ref(false)
const enabledTypes = ref(['single', 'multiple', 'likert', 'dropdown'])
const view = ref('respondent') // 'respondent' | 'list'
const editing = ref(null) // { kind, index, label, options }
const answers = ref({}) // preview clicks only, never saved
const opts = ref({ archiveOthers: true, createQuestionnaire: true, title: '' })
const importing = ref(false)
const done = ref(null)
const dragging = ref(false)

onMounted(async () => { try { enabledTypes.value = (await admin.getSettings()).enabledQuestionTypes } catch { /* defaults */ } })

const model = computed(() => (raw.value ? finalizeModel(raw.value, enabledTypes.value) : null))
const sections = computed(() => {
  const out = []
  for (const [i, q] of (model.value?.questions ?? []).entries()) {
    let s = out.find(x => x.name === q.section)
    if (!s) out.push((s = { name: q.section || 'Questions', items: [] }))
    s.items.push({ q, i })
  }
  return out
})
const errors = computed(() => model.value?.warnings.filter(w => w.level === 'error') ?? [])
const warnings = computed(() => model.value?.warnings.filter(w => w.level !== 'error') ?? [])
const flagged = computed(() => new Set((model.value?.warnings ?? []).map(w => w.ref)))
const scenarioStart = (items, k) => k === 0 || items[k - 1].q.scenario !== items[k].q.scenario

async function onFile(file) {
  if (!file) return
  parsing.value = true
  parseError.value = ''
  done.value = null
  raw.value = null
  try {
    raw.value = await parseImportFile(file)
    fileName.value = file.name
    opts.value.title = `Privacy survey – ${file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')}`
    if (!raw.value.questions.length && !raw.value.demographics.length) parseError.value = 'No questions were found in this file. Check that it follows the template.'
  } catch (e) {
    parseError.value = e.message
  } finally {
    parsing.value = false
  }
}
const pick = e => onFile(e.target.files?.[0])
const drop = e => { dragging.value = false; onFile(e.dataTransfer.files?.[0]) }

// ---- edit one item in the preview ----
function startEdit(kind, index) {
  const it = kind === 'demo' ? raw.value.demographics[index] : raw.value.questions[index]
  editing.value = {
    kind, index,
    label: kind === 'demo' ? it.label : it.questionText,
    type: (kind === 'demo' ? model.value.demographics[index] : model.value.questions[index]).type, // finalized type (incl. defaults)
    options: it.options.map(o => (o.other ? `${o.label} [text]` : o.label ?? o)).join('\n'),
  }
}
function saveEdit() {
  const e = editing.value
  const lines = e.options.split('\n').map(l => l.trim()).filter(Boolean)
  if (e.kind === 'demo') {
    const d = raw.value.demographics[e.index]
    d.label = e.label
    if (e.type) d.type = e.type
    d.options = lines.map(l => (/\[text\]$/i.test(l) ? { label: l.replace(/\s*\[text\]$/i, ''), other: true } : { label: l }))
    raw.value.warnings = raw.value.warnings.filter(w => w.ref !== d.id)
  } else {
    const q = raw.value.questions[e.index]
    q.questionText = e.label
    q.type = e.type
    q.options = lines
    raw.value.warnings = raw.value.warnings.filter(w => w.ref !== q.questionId)
  }
  editing.value = null
}
function removeItem(kind, index) {
  ;(kind === 'demo' ? raw.value.demographics : raw.value.questions).splice(index, 1)
}

function download(name, text, type = 'text/csv') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
async function downloadPreviewCsv() {
  const ml = (await getModelConfig().catch(() => null))?.questions ?? {}
  download(fileName.value.replace(/\.[^.]+$/, '') + '.csv', modelToCsv(model.value, ml))
}
async function exportBank() {
  try {
    const [qs, ds, cfg] = await Promise.all([admin.listQuestions(), admin.listDemographics(), getModelConfig()])
    download('question-bank-export.csv', modelToCsv({ questions: qs.filter(q => q.status !== 'archived'), demographics: ds.filter(d => d.status !== 'archived') }, cfg.questions))
  } catch (e) { toast.error(e.message) }
}

async function doImport() {
  importing.value = true
  try {
    done.value = await applyImport(model.value, opts.value)
    toast.success('Import complete.')
  } catch (e) {
    toast.error(e.message)
  } finally {
    importing.value = false
  }
}
function reset() { raw.value = null; done.value = null; fileName.value = ''; parseError.value = '' }
</script>

<template>
  <div class="imp">
    <p class="wp-text">
      Upload the survey as a Word document (.docx, same layout as <em>Privacy_Survey_Questions.docx</em>), a CSV, or JSON.
      You will see exactly what respondents will see <strong>before</strong> anything is saved.
    </p>

    <!-- STEP 1: choose file -->
    <section v-if="!model && !done" class="wp-card">
      <label class="drop" :class="{ on: dragging }" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="drop">
        <input type="file" accept=".docx,.csv,.json" class="sr" @change="pick" />
        <Icon name="upload" :size="28" />
        <strong>{{ parsing ? 'Reading file…' : 'Choose a file or drop it here' }}</strong>
        <span class="wp-text" style="font-size: 13px; margin: 0;">.docx · .csv · .json</span>
      </label>
      <p v-if="parseError" class="wp-error" role="alert">{{ parseError }}</p>
      <div class="row-btns">
        <a class="wp-btn ad-mini" href="/templates/privacy-survey-template.csv" download>Download CSV template</a>
        <button class="wp-btn ad-mini" @click="exportBank">Export current question bank (CSV)</button>
      </div>
    </section>

    <!-- STEP 2: preview -->
    <template v-if="model && !done">
      <div class="ad-grid">
        <div class="ad-stat">File<b style="font-size: 15px; word-break: break-all;">{{ fileName }}</b></div>
        <div class="ad-stat">Demographic fields<b>{{ model.demographics.length }}</b></div>
        <div class="ad-stat">Questions<b>{{ model.questions.length }}</b></div>
        <div class="ad-stat">Sections<b>{{ sections.length }}</b></div>
      </div>

      <div v-if="errors.length" class="msg err" role="alert">
        <strong>Fix these before importing:</strong>
        <ul><li v-for="w in errors" :key="w.text">{{ w.text }}</li></ul>
      </div>
      <div v-if="warnings.length" class="msg warn">
        <strong>Please check:</strong>
        <ul><li v-for="w in warnings" :key="w.text">{{ w.text }}</li></ul>
        <span style="font-size: 13px;">Use <em>Edit</em> on an item to fix it here (the original file is not changed).</span>
      </div>

      <div class="ad-toolbar" role="tablist">
        <button role="tab" :aria-selected="view === 'respondent'" class="wp-btn ad-mini" :class="{ 'wp-btn-primary': view === 'respondent' }" @click="view = 'respondent'">As respondents see it</button>
        <button role="tab" :aria-selected="view === 'list'" class="wp-btn ad-mini" :class="{ 'wp-btn-primary': view === 'list' }" @click="view = 'list'">Compact list</button>
        <span style="flex: 1;"></span>
        <button class="wp-btn ad-mini" @click="downloadPreviewCsv">Save as CSV</button>
        <button class="wp-btn ad-mini" @click="reset">Choose another file</button>
      </div>

      <!-- Demographics -->
      <details open class="wp-card sec">
        <summary><strong>Demographics</strong> <span class="wp-text">({{ model.demographics.length }} fields)</span></summary>
        <div v-for="(d, i) in model.demographics" :key="d.id" class="item" :class="{ flag: flagged.has(d.id) }">
          <div class="item-head">
            <code>{{ d.id }}</code><span class="chip">{{ DEMOGRAPHIC_TYPES[d.type] }}</span><span v-if="d.required" class="chip">Required</span>
            <span style="flex: 1;"></span>
            <button class="wp-btn ad-mini" @click="startEdit('demo', i)">Edit</button>
            <button class="wp-btn ad-mini ad-danger" @click="removeItem('demo', i)">Remove</button>
          </div>
          <p class="wp-label" style="margin: 6px 0;">{{ d.label }}</p>
          <div class="opts"><span v-for="o in d.options" :key="o.value" class="opt">{{ o.label }}<em v-if="o.other"> + text box</em></span></div>
        </div>
      </details>

      <!-- Questions by section -->
      <details v-for="s in sections" :key="s.name" open class="wp-card sec">
        <summary><strong>{{ s.name }}</strong> <span class="wp-text">({{ s.items.length }} questions)</span></summary>
        <template v-for="(it, k) in s.items" :key="it.q.questionId">
          <p v-if="it.q.scenario && scenarioStart(s.items, k)" class="scen">{{ it.q.scenario }}</p>
          <div class="item" :class="{ flag: flagged.has(it.q.questionId) }">
            <div class="item-head">
              <code>{{ it.q.questionId }}</code><span class="chip">{{ QUESTION_TYPES[it.q.type]?.label ?? it.q.type }}</span>
              <span class="chip">{{ it.q.options.length }} options</span>
              <span style="flex: 1;"></span>
              <button class="wp-btn ad-mini" @click="startEdit('q', it.i)">Edit</button>
              <button class="wp-btn ad-mini ad-danger" @click="removeItem('q', it.i)">Remove</button>
            </div>
            <QuestionInput v-if="view === 'respondent'" v-model="answers[it.q.questionId]" :question="{ ...it.q, scenario: '' }" />
            <template v-else>
              <p style="margin: 6px 0; font-size: 14px;">{{ it.q.questionText }}</p>
              <div class="opts"><span v-for="o in it.q.options" :key="o.value" class="opt">{{ o.label }}</span></div>
            </template>
          </div>
        </template>
      </details>

      <!-- STEP 3: import -->
      <section class="wp-card">
        <h2 class="wp-title" style="font-size: 19px;">Import</h2>
        <label class="wp-option"><input v-model="opts.createQuestionnaire" type="checkbox" /><span>Also create a <strong>draft questionnaire</strong> with these questions, in this order (you preview and publish it in Questionnaire Management)</span></label>
        <input v-if="opts.createQuestionnaire" v-model="opts.title" class="ad-input" style="width: 100%; margin: 4px 0 10px;" aria-label="Questionnaire title" />
        <label class="wp-option"><input v-model="opts.archiveOthers" type="checkbox" /><span><strong>Archive</strong> questions and demographic fields that are not in this file (nothing is deleted; published versions keep their copy)</span></label>
        <p class="wp-text" style="font-size: 13px;">Items with the same id are updated, new ones are added. Imported items are marked published in the bank.</p>
        <button class="wp-btn wp-btn-primary" :disabled="importing || errors.length > 0" @click="doImport">
          {{ importing ? 'Importing…' : `Import ${model.demographics.length} fields and ${model.questions.length} questions` }}
        </button>
      </section>
    </template>

    <!-- Done -->
    <section v-if="done" class="wp-card">
      <h2 class="wp-title" style="font-size: 22px;">Import complete</h2>
      <p class="wp-text">
        Saved {{ done.demographics }} demographic fields and {{ done.questions }} questions<span v-if="done.archived">, archived {{ done.archived }} old item(s)</span><span v-if="done.mlUpdated">, updated classifier settings for {{ done.mlUpdated }} question(s)</span>.
      </p>
      <p class="wp-text" v-if="done.questionnaireId">Next: open <strong>Questionnaire Management</strong>, press <em>Preview</em> to walk through it as a respondent, then <em>Publish</em>.</p>
      <div class="row-btns">
        <button class="wp-btn wp-btn-primary" @click="router.push({ name: 'admin-questionnaires' })">Go to Questionnaire Management</button>
        <button class="wp-btn" @click="router.push({ name: 'admin-ml' })">Test the classifier</button>
        <button class="wp-btn" @click="reset">Import another file</button>
      </div>
    </section>

    <!-- Edit dialog -->
    <div v-if="editing" class="ad-modalbg" @click.self="editing = null">
      <form class="ad-modal" role="dialog" aria-modal="true" aria-label="Edit imported item" @submit.prevent="saveEdit">
        <h2 class="wp-title" style="font-size: 20px;">Edit before import</h2>
        <label class="wp-label" for="el">{{ editing.kind === 'demo' ? 'Field label' : 'Question text' }}</label>
        <textarea id="el" v-model="editing.label" class="ad-input" rows="3" style="width: 100%;"></textarea>
        <label class="wp-label" for="et" style="margin-top: 10px;">Type</label>
        <select id="et" v-model="editing.type" class="ad-input" style="width: 100%;">
          <template v-if="editing.kind === 'demo'"><option v-for="(l, k) in DEMOGRAPHIC_TYPES" :key="k" :value="k">{{ l }}</option></template>
          <template v-else><option v-for="(t, k) in QUESTION_TYPES" :key="k" :value="k">{{ t.label }}</option></template>
        </select>
        <label class="wp-label" for="eo" style="margin-top: 10px;">Options — one per line<span v-if="editing.kind === 'demo'"> (end a line with <code>[text]</code> for an “Other” text box)</span></label>
        <textarea id="eo" v-model="editing.options" class="ad-input" rows="10" style="width: 100%; font-family: inherit;"></textarea>
        <div class="wp-actions">
          <button type="button" class="wp-btn" @click="editing = null">Cancel</button>
          <button type="submit" class="wp-btn wp-btn-primary">Apply</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.drop { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 36px 16px; border: 2px dashed var(--line, #d9d4c7); border-radius: 18px; cursor: pointer; text-align: center; transition: background .15s; }
.drop.on, .drop:hover { background: rgba(0, 0, 0, .03); }
.sr { position: absolute; width: 1px; height: 1px; opacity: 0; }
.drop:focus-within { outline: 2px solid var(--coral, #F47B5E); outline-offset: 3px; }
.row-btns { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
.msg { border-radius: 14px; padding: 12px 16px; margin-bottom: 14px; font-size: 14px; }
.msg ul { margin: 6px 0; padding-left: 18px; }
.err { background: #FDECEA; color: #8A1C12; }
.warn { background: #FFF6E0; color: #7A4B00; }
.sec > summary { cursor: pointer; font-size: 16px; margin-bottom: 4px; }
.item { border-top: 1px solid var(--line, #ece8de); padding: 14px 0; }
.item.flag { background: #FFF6E0; margin: 0 -12px; padding: 14px 12px; border-radius: 10px; }
.item-head { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.item-head code { font-size: 12px; }
.chip { font-size: 11px; padding: 2px 8px; border-radius: 99px; background: #F0EEE7; }
.opts { display: flex; flex-wrap: wrap; gap: 6px; }
.opt { font-size: 13px; padding: 4px 10px; border-radius: 99px; border: 1px solid var(--line, #e2ddd0); background: white; }
.opt em { color: var(--ink-soft, #777); font-style: normal; }
.scen { background: #F4F1EA; border-radius: 12px; padding: 12px 14px; font-size: 14px; line-height: 1.5; margin: 12px 0 0; }
</style>
