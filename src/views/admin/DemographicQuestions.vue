<script setup>
import { ref, computed, onMounted } from 'vue'
import StateBlock from '../../components/common/StateBlock.vue'
import ConfirmModal from '../../components/common/ConfirmModal.vue'
import DemographicEditor from '../../components/admin/DemographicEditor.vue'
import Icon from '../../components/ui/Icon.vue'
import { useToastStore } from '../../stores/toast'
import * as admin from '../../services/adminService'
import { blankDemographic, DEMOGRAPHIC_TYPES } from '../../utils/questions'

const toast = useToastStore()
const rows = ref([])
const loading = ref(true)
const error = ref('')
const q = ref('')
const editing = ref(null)
const isNew = ref(false)
const saving = ref(false)
const toggling = ref(null)

async function load() {
  loading.value = true
  error.value = ''
  try { rows.value = await admin.listDemographics() } catch (e) { error.value = e.message } finally { loading.value = false }
}
onMounted(load)
const shown = computed(() => rows.value.filter(r => !q.value || r.label.toLowerCase().includes(q.value.toLowerCase())))
const publishedCount = computed(() => rows.value.filter(r => r.status === 'published').length)

function add() {
  editing.value = blankDemographic(Math.max(0, ...rows.value.map(r => r.order ?? 0)) + 1, admin.newDemographicId())
  isNew.value = true
}
function edit(r) { editing.value = JSON.parse(JSON.stringify(r)); isNew.value = false }
async function save(v) {
  saving.value = true
  try {
    await admin.saveDemographic(v, isNew.value)
    toast.success('Demographic field saved. It reaches respondents when you publish a new questionnaire version.')
    editing.value = null
    await load()
  } catch (e) { toast.error(e.message) } finally { saving.value = false }
}
async function confirmToggle() {
  const r = toggling.value
  try {
    await admin.setDemographicStatus(r.id, r.status === 'archived' ? 'draft' : 'archived')
    toast.success(r.status === 'archived' ? 'Field restored as draft.' : 'Field archived.')
    toggling.value = null
    await load()
  } catch (e) { toast.error(e.message) }
}
</script>

<template>
  <div>
    <p class="wp-text">
      These fields form the demographic step of the survey. Each questionnaire version stores its own copy when published, so changing a field
      here never alters previous versions. <strong>{{ publishedCount }}</strong> published field(s) will be included in the next published version.
    </p>
    <div class="ad-toolbar">
      <input v-model="q" class="ad-input" style="flex: 1; min-width: 180px;" placeholder="Search fields" aria-label="Search demographic fields" />
      <button class="wp-btn wp-btn-primary" @click="add"><Icon name="plus" :size="15" /> Add field</button>
    </div>
    <StateBlock :loading="loading" :error="error" :empty="!rows.length" empty-text="No demographic fields yet. Add the fields required by the approved research design." @retry="load">
      <div class="ad-tablewrap">
        <table class="ad-table">
          <thead><tr><th>Order</th><th>Label</th><th>Type</th><th>Options</th><th>Required</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            <tr v-for="r in shown" :key="r.id">
              <td>{{ r.order }}</td><td>{{ r.label }}</td><td>{{ DEMOGRAPHIC_TYPES[r.type] }}</td>
              <td style="max-width: 260px;">{{ r.options.map(o => o.label).join(', ') }}</td>
              <td>{{ r.required ? 'Yes' : 'No' }}</td>
              <td><span class="ad-badge" :class="'b-' + r.status">{{ r.status }}</span></td>
              <td style="white-space: nowrap;">
                <button class="wp-btn ad-mini" @click="edit(r)">Edit</button>
                <button class="wp-btn ad-mini" @click="toggling = r">{{ r.status === 'archived' ? 'Restore' : 'Archive' }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </StateBlock>
    <DemographicEditor v-if="editing" :field="editing" :is-new="isNew" :saving="saving" @save="save" @cancel="editing = null" />
    <ConfirmModal
      v-if="toggling" :title="toggling.status === 'archived' ? 'Restore field?' : 'Archive field?'" :danger="toggling.status !== 'archived'"
      :confirm-text="toggling.status === 'archived' ? 'Restore' : 'Archive'"
      message="Archived fields are left out of newly published versions. Published versions keep their own copy."
      @cancel="toggling = null" @confirm="confirmToggle"
    />
  </div>
</template>
