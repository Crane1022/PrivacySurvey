<script setup>
import { ref, onMounted } from 'vue'
import StateBlock from '../../components/common/StateBlock.vue'
import ConfirmModal from '../../components/common/ConfirmModal.vue'
import { useToastStore } from '../../stores/toast'
import * as admin from '../../services/adminService'
import { QUESTION_TYPES } from '../../utils/questions'

const toast = useToastStore()
const form = ref(null)
const ml = ref(null)
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const confirm = ref(null)

async function load() {
  loading.value = true
  error.value = ''
  try { ;[form.value, ml.value] = await Promise.all([admin.getSettings(), admin.getMlSchema()]) }
  catch (e) { error.value = e.message } finally { loading.value = false }
}
onMounted(load)

async function save() {
  if (!form.value.consentVersion.trim()) return toast.error('Consent version is required.')
  if (!form.value.enabledQuestionTypes.length) return toast.error('Enable at least one question type.')
  saving.value = true
  try { await admin.saveSettings(form.value); toast.success('Settings saved.') } catch (e) { toast.error(e.message) } finally { saving.value = false }
}
async function mlAction() {
  try {
    if (confirm.value === 'lock') await admin.lockMlSchemaToPublished()
    else await admin.unlockMlSchema()
    toast.success(confirm.value === 'lock' ? 'ML schema locked to the published questionnaire.' : 'ML schema unlocked.')
    confirm.value = null
    await load()
  } catch (e) { toast.error(e.message); confirm.value = null }
}
</script>

<template>
  <StateBlock :loading="loading" :error="error" @retry="load">
    <template v-if="form">
      <form class="wp-card" @submit.prevent="save">
        <h2 class="wp-title" style="font-size: 18px;">Survey</h2>
        <label class="wp-option"><input v-model="form.surveyOpen" type="checkbox" /><span>Survey is open to respondents</span></label>
        <label class="wp-label" for="cv">Consent version</label>
        <input id="cv" v-model="form.consentVersion" class="ad-input" style="width: 100%; max-width: 320px;" />
        <p class="wp-text" style="font-size: 13px;">Recorded with every response. Change it whenever the approved consent wording changes.</p>
        <span class="wp-label">Question types available to admins</span>
        <label v-for="(t, k) in QUESTION_TYPES" :key="k" class="wp-option" style="padding: 8px 12px;">
          <input v-model="form.enabledQuestionTypes" type="checkbox" :value="k" /><span>{{ t.label }}</span>
        </label>
        <p class="wp-text" style="font-size: 13px;">Only enable types that the backend preprocessing and ML pipeline support.</p>
        <button class="wp-btn wp-btn-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save settings' }}</button>
      </form>

      <div class="wp-card">
        <h2 class="wp-title" style="font-size: 18px;">ML feature schema</h2>
        <p class="wp-text">
          Status: <strong>{{ ml.locked ? `Locked (from version ${ml.lockedFromVersion})` : 'Unlocked' }}</strong>.
          When locked, a questionnaire can only be published if its questions, types and answer options match the schema the model was trained on.
          Lock it once the ML developer confirms the published questionnaire matches the trained model.
        </p>
        <button v-if="!ml.locked" class="wp-btn" @click="confirm = 'lock'">Lock to published questionnaire</button>
        <button v-else class="wp-btn ad-danger" @click="confirm = 'unlock'">Unlock schema</button>
      </div>
    </template>
    <ConfirmModal
      v-if="confirm" :title="confirm === 'lock' ? 'Lock ML schema?' : 'Unlock ML schema?'" :danger="confirm === 'unlock'" :confirm-text="confirm === 'lock' ? 'Lock' : 'Unlock'"
      :message="confirm === 'lock' ? 'The currently published questionnaire becomes the reference schema.' : 'Incompatible questionnaires could then be published. Only do this if the ML developer has confirmed a retrained model.'"
      @cancel="confirm = null" @confirm="mlAction"
    />
  </StateBlock>
</template>
