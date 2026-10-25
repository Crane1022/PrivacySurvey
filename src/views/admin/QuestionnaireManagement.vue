<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import StateBlock from '../../components/common/StateBlock.vue'
import ConfirmModal from '../../components/common/ConfirmModal.vue'
import { useToastStore } from '../../stores/toast'
import { useAssessmentStore } from '../../stores/assessment'
import * as admin from '../../services/adminService'
import { QUESTION_TYPES } from '../../utils/questions'

const router = useRouter()
const toast = useToastStore()
const assessment = useAssessmentStore()

const list = ref([])
const bank = ref([])
const loading = ref(true)
const error = ref('')
const editing = ref(null) // working copy of a questionnaire
const newForm = ref(null) // { title, description }
const addId = ref('')
const busy = ref(false)
const confirm = ref(null) // { kind, qn }
const problems = ref([])

const fmt = v => (v ? new Date(v).toLocaleString() : '-')
const readOnly = computed(() => editing.value && editing.value.status !== 'draft')
const available = computed(() => bank.value.filter(b => b.status === 'published' && !editing.value?.questions.some(q => q.questionId === b.questionId)))

async function load() {
  loading.value = true
  error.value = ''
  try { ;[list.value, bank.value] = await Promise.all([admin.listQuestionnaires(), admin.listQuestions()]) }
  catch (e) { error.value = e.message } finally { loading.value = false }
}
onMounted(load)

function open(qn) { editing.value = JSON.parse(JSON.stringify(qn)); problems.value = []; addId.value = '' }
async function createDraft() {
  if (!newForm.value.title.trim()) return toast.error('Give the questionnaire a title.')
  busy.value = true
  try {
    const id = await admin.createDraft(newForm.value)
    newForm.value = null
    await load()
    open(list.value.find(x => x.questionnaireId === id))
    toast.success('Draft created.')
  } catch (e) { toast.error(e.message) } finally { busy.value = false }
}
function addQuestion() {
  const b = bank.value.find(x => x.questionId === addId.value)
  if (!b) return
  editing.value.questions.push(JSON.parse(JSON.stringify(b)))
  addId.value = ''
}
function move(i, d) {
  const a = editing.value.questions, j = i + d
  if (j < 0 || j >= a.length) return
  ;[a[i], a[j]] = [a[j], a[i]]
}
async function saveDraft(quiet = false) {
  await admin.saveDraft(editing.value.questionnaireId, editing.value)
  if (!quiet) toast.success('Draft saved.')
}
async function run(fn) {
  busy.value = true
  problems.value = []
  try { await fn() } catch (e) { problems.value = e.problems ?? []; toast.error(e.message) } finally { busy.value = false }
}
const save = () => run(async () => { await saveDraft(); await load() })
const preview = qn => run(async () => {
  const target = qn ?? editing.value
  if (!qn) await saveDraft(true)
  const fresh = (await admin.listQuestionnaires()).find(x => x.questionnaireId === target.questionnaireId)
  assessment.startPreview(await admin.previewConfigFor(fresh))
  router.push({ name: 'consent' })
})
async function doConfirm() {
  const { kind, qn } = confirm.value
  await run(async () => {
    if (kind === 'publish') {
      if (editing.value?.questionnaireId === qn.questionnaireId) await saveDraft(true)
      await admin.publishQuestionnaire(qn.questionnaireId)
      toast.success(`Version ${qn.version} is now live on the respondent website.`)
      editing.value = null
    } else if (kind === 'archive') {
      await admin.archiveQuestionnaire(qn.questionnaireId)
      toast.success('Questionnaire archived.')
      editing.value = null
    } else if (kind === 'version') {
      const id = await admin.createNewVersionFrom(qn.questionnaireId)
      await load()
      open(list.value.find(x => x.questionnaireId === id))
      toast.success('New draft version created.')
    }
    confirm.value = null
    await load()
  })
  confirm.value = null
}
</script>

<template>
  <StateBlock :loading="loading" :error="error" @retry="load">
    <!-- LIST -->
    <template v-if="!editing">
      <div class="ad-toolbar">
        <button class="wp-btn wp-btn-primary" @click="newForm = { title: '', description: '' }">+ New draft</button>
        <span class="wp-text" style="font-size: 13px;">Only the published questionnaire appears on the respondent website.</span>
      </div>
      <form v-if="newForm" class="wp-card" @submit.prevent="createDraft">
        <label class="wp-label" for="nt">Title *</label>
        <input id="nt" v-model="newForm.title" class="ad-input" style="width: 100%; margin-bottom: 10px;" />
        <label class="wp-label" for="nd">Description</label>
        <input id="nd" v-model="newForm.description" class="ad-input" style="width: 100%;" />
        <div class="wp-actions"><button type="button" class="wp-btn" @click="newForm = null">Cancel</button><button class="wp-btn wp-btn-primary" :disabled="busy">Create draft</button></div>
      </form>
      <p v-if="!list.length" class="wp-text">No questionnaires yet. Create a draft, add questions from the bank, then publish.</p>
      <div v-else class="ad-tablewrap">
        <table class="ad-table">
          <thead><tr><th>Version</th><th>Title</th><th>Status</th><th>Questions</th><th>Updated</th><th>Published</th><th>Actions</th></tr></thead>
          <tbody>
            <tr v-for="x in list" :key="x.questionnaireId">
              <td>v{{ x.version }}</td><td>{{ x.title }}</td>
              <td><span class="ad-badge" :class="'b-' + x.status">{{ x.status }}</span></td>
              <td>{{ x.questions?.length ?? 0 }}</td><td>{{ fmt(x.updatedAt) }}</td><td>{{ fmt(x.publishedAt) }}</td>
              <td style="white-space: nowrap;">
                <button class="wp-btn ad-mini" @click="open(x)">{{ x.status === 'draft' ? 'Edit' : 'View' }}</button>
                <button class="wp-btn ad-mini" :disabled="busy" @click="preview(x)">Preview</button>
                <button class="wp-btn ad-mini" @click="confirm = { kind: 'version', qn: x }">New version</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- EDITOR -->
    <template v-else>
      <button class="wp-btn ad-mini" style="margin-bottom: 14px;" @click="editing = null">← All questionnaires</button>
      <div class="wp-card">
        <p class="wp-eyebrow">Version {{ editing.version }} · <span class="ad-badge" :class="'b-' + editing.status">{{ editing.status }}</span></p>
        <label class="wp-label" for="et">Title</label>
        <input id="et" v-model="editing.title" class="ad-input" style="width: 100%; margin-bottom: 10px;" :disabled="readOnly" />
        <label class="wp-label" for="ed">Description</label>
        <input id="ed" v-model="editing.description" class="ad-input" style="width: 100%;" :disabled="readOnly" />
        <p class="wp-text" style="font-size: 13px; margin-bottom: 0;">
          <template v-if="editing.status === 'draft'">Demographic fields are taken from the published fields under
            <router-link to="/staff/demographic-questions">Demographic Questions</router-link> when you preview or publish.</template>
          <template v-else>Demographic fields in this version: {{ editing.demographics?.map(d => d.label).join(', ') || 'none' }}.</template>
        </p>
      </div>

      <div class="wp-card">
        <h2 class="wp-title" style="font-size: 18px;">Questions ({{ editing.questions.length }})</h2>
        <p v-if="!editing.questions.length" class="wp-text">No questions yet.</p>
        <div v-for="(q, i) in editing.questions" :key="q.questionId" style="display: flex; gap: 8px; align-items: center; padding: 8px 0; border-top: 1px solid var(--color-border);">
          <span style="width: 26px; color: var(--color-muted);">{{ i + 1 }}</span>
          <span style="flex: 1; min-width: 0;">{{ q.questionText }} <small class="wp-text">({{ QUESTION_TYPES[q.type]?.label }})</small></span>
          <template v-if="!readOnly">
            <button class="wp-btn ad-mini" aria-label="Move up" @click="move(i, -1)">↑</button>
            <button class="wp-btn ad-mini" aria-label="Move down" @click="move(i, 1)">↓</button>
            <button class="wp-btn ad-mini ad-danger" aria-label="Remove from questionnaire" @click="editing.questions.splice(i, 1)">✕</button>
          </template>
        </div>
        <div v-if="!readOnly" class="ad-toolbar" style="margin: 14px 0 0;">
          <select v-model="addId" class="ad-input" style="flex: 1;" aria-label="Add question from bank">
            <option value="">Add a published question from the bank…</option>
            <option v-for="b in available" :key="b.questionId" :value="b.questionId">{{ b.questionText }}</option>
          </select>
          <button class="wp-btn" :disabled="!addId" @click="addQuestion">Add</button>
        </div>
        <p v-if="!readOnly" class="wp-text" style="font-size: 13px;">Questions are copied from the bank when you publish, so the published version stays fixed even if the bank question is edited later.</p>
      </div>

      <div v-if="problems.length" class="wp-error" role="alert">
        <strong>Cannot publish:</strong>
        <ul style="margin: 6px 0 0; padding-left: 18px;"><li v-for="p in problems" :key="p">{{ p }}</li></ul>
      </div>

      <div class="wp-actions">
        <button class="wp-btn" :disabled="busy" @click="preview()">Preview assessment</button>
        <span style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button v-if="editing.status !== 'archived'" class="wp-btn ad-danger" :disabled="busy" @click="confirm = { kind: 'archive', qn: editing }">Archive</button>
          <template v-if="editing.status === 'draft'">
            <button class="wp-btn" :disabled="busy" @click="save">Save draft</button>
            <button class="wp-btn wp-btn-primary" :disabled="busy" @click="confirm = { kind: 'publish', qn: editing }">Publish</button>
          </template>
          <button v-else class="wp-btn wp-btn-primary" @click="confirm = { kind: 'version', qn: editing }">Create new version</button>
        </span>
      </div>
    </template>

    <ConfirmModal
      v-if="confirm" :busy="busy"
      :title="{ publish: 'Publish this questionnaire?', archive: 'Archive this questionnaire?', version: 'Create a new draft version?' }[confirm.kind]"
      :confirm-text="{ publish: 'Publish', archive: 'Archive', version: 'Create draft' }[confirm.kind]" :danger="confirm.kind === 'archive'"
      :message="{
        publish: `Version ${confirm.qn.version} will replace the currently published questionnaire on the respondent website. The previous version is archived and kept for historical responses. Published versions cannot be edited.`,
        archive: 'Archived questionnaires are no longer shown to respondents. Existing responses remain linked to this version. If this is the published version, respondents will see that no survey is available.',
        version: `A copy of version ${confirm.qn.version} will be created as a new draft. The original is left unchanged.`,
      }[confirm.kind]"
      @cancel="confirm = null" @confirm="doConfirm"
    />
  </StateBlock>
</template>
