<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import StateBlock from '../../components/common/StateBlock.vue'
import ConfirmModal from '../../components/common/ConfirmModal.vue'
import QuestionEditor from '../../components/admin/QuestionEditor.vue'
import QuestionInput from '../../components/common/QuestionInput.vue'
import { useToastStore } from '../../stores/toast'
import * as admin from '../../services/adminService'
import Pagination from '../../components/ui/Pagination.vue'
import { QUESTION_TYPES, blankQuestion } from '../../utils/questions'

const toast = useToastStore()
const rows = ref([])
const settings = ref(null)
const loading = ref(true)
const error = ref('')
const q = ref('')
const fStatus = ref('')
const fType = ref('')
const sortKey = ref('order')
const sortDir = ref(1)
const editing = ref(null)
const isNew = ref(false)
const saving = ref(false)
const viewing = ref(null)
const viewAnswer = ref(undefined)
const toggling = ref(null)
const page = ref(1)

async function load() {
  loading.value = true
  error.value = ''
  try {
    ;[rows.value, settings.value] = await Promise.all([admin.listQuestions(), admin.getSettings()])
  } catch (e) { error.value = e.message } finally { loading.value = false }
}
onMounted(load)

const shown = computed(() => {
  const t = q.value.trim().toLowerCase()
  return rows.value
    .filter(r => (!fStatus.value || r.status === fStatus.value) && (!fType.value || r.type === fType.value))
    .filter(r => !t || r.questionText.toLowerCase().includes(t) || r.questionId.toLowerCase().includes(t))
    .sort((a, b) => (String(a[sortKey.value] ?? '') < String(b[sortKey.value] ?? '') ? -1 : 1) * sortDir.value * (sortKey.value === 'order' ? 1 : 1))
})
watch([q, fStatus, fType], () => { page.value = 1 })
const pageRows = computed(() => shown.value.slice((page.value - 1) * 10, page.value * 10))
function sortBy(k) {
  if (sortKey.value === k) sortDir.value *= -1
  else { sortKey.value = k; sortDir.value = 1 }
}
const fmt = v => (v ? new Date(v).toLocaleString() : '-')

function add() {
  editing.value = blankQuestion(Math.max(0, ...rows.value.map(r => r.order ?? 0)) + 1)
  isNew.value = true
}
function edit(r) { editing.value = JSON.parse(JSON.stringify(r)); isNew.value = false }
async function save(v) {
  saving.value = true
  try {
    await admin.saveQuestion(v, isNew.value)
    toast.success(isNew.value ? 'Question added to the bank.' : 'Question updated.')
    editing.value = null
    await load()
  } catch (e) { toast.error(e.message) } finally { saving.value = false }
}
async function confirmStatus() {
  const r = toggling.value
  const next = r.status === 'archived' ? 'draft' : 'archived'
  try {
    await admin.setQuestionStatus(r.questionId, next)
    toast.success(next === 'archived' ? 'Question archived.' : 'Question restored as draft.')
    toggling.value = null
    await load()
  } catch (e) { toast.error(e.message) }
}
</script>

<template>
  <div>
    <div class="ad-toolbar">
      <input v-model="q" class="ad-input" style="flex: 1; min-width: 180px;" placeholder="Search by title or ID" aria-label="Search questions" />
      <select v-model="fStatus" class="ad-input" aria-label="Filter by status">
        <option value="">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
      </select>
      <select v-model="fType" class="ad-input" aria-label="Filter by type">
        <option value="">All types</option><option v-for="(t, k) in QUESTION_TYPES" :key="k" :value="k">{{ t.label }}</option>
      </select>
      <button class="wp-btn wp-btn-primary" @click="add">+ Add question</button>
    </div>

    <StateBlock :loading="loading" :error="error" :empty="!rows.length" empty-text="The question bank is empty. Add your first question." @retry="load">
      <div class="ad-tablewrap">
        <table class="ad-table">
          <thead>
            <tr>
              <th><button @click="sortBy('questionId')">Question ID</button></th>
              <th><button @click="sortBy('questionText')">Question</button></th>
              <th><button @click="sortBy('type')">Type</button></th>
              <th><button @click="sortBy('status')">Status</button></th>
              <th><button @click="sortBy('order')">Order</button></th>
              <th><button @click="sortBy('updatedAt')">Updated</button></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in pageRows" :key="r.questionId">
              <td><code>{{ r.questionId }}</code></td>
              <td style="min-width: 220px;">{{ r.questionText }}</td>
              <td>{{ QUESTION_TYPES[r.type]?.label ?? r.type }}</td>
              <td><span class="ad-badge" :class="'b-' + r.status">{{ r.status }}</span></td>
              <td>{{ r.order }}</td>
              <td style="white-space: nowrap;">{{ fmt(r.updatedAt) }}</td>
              <td style="white-space: nowrap;">
                <button class="wp-btn ad-mini" @click="viewing = r; viewAnswer = undefined">View</button>
                <button class="wp-btn ad-mini" @click="edit(r)">Edit</button>
                <button class="wp-btn ad-mini" @click="toggling = r">{{ r.status === 'archived' ? 'Restore' : 'Archive' }}</button>
              </td>
            </tr>
            <tr v-if="!shown.length"><td colspan="7" class="wp-text" style="text-align: center;">No questions match the filters.</td></tr>
          </tbody>
        </table>
      </div>
      <Pagination v-model:page="page" :total="shown.length" />
    </StateBlock>

    <QuestionEditor v-if="editing && settings" :question="editing" :is-new="isNew" :enabled-types="settings.enabledQuestionTypes" :saving="saving" @save="save" @cancel="editing = null" />

    <div v-if="viewing" class="ad-modalbg" @click.self="viewing = null">
      <div class="ad-modal" role="dialog" aria-modal="true" aria-label="Question preview">
        <QuestionInput v-model="viewAnswer" :question="viewing" />
        <div class="wp-actions"><button class="wp-btn" @click="viewing = null">Close</button></div>
      </div>
    </div>

    <ConfirmModal
      v-if="toggling" :title="toggling.status === 'archived' ? 'Restore question?' : 'Archive question?'" :danger="toggling.status !== 'archived'"
      :confirm-text="toggling.status === 'archived' ? 'Restore' : 'Archive'"
      :message="toggling.status === 'archived' ? 'It will return as a draft.' : 'Archived questions can no longer be added to new questionnaires. Questions are never permanently deleted, so submitted surveys stay reproducible. Published questionnaires keep their own copy.'"
      @cancel="toggling = null" @confirm="confirmStatus"
    />
  </div>
</template>
