<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAssessmentStore } from '../stores/assessment'
import AssessmentShell from '../components/ui/AssessmentShell.vue'
import DemoBanner from '../components/common/DemoBanner.vue'
import StateBlock from '../components/common/StateBlock.vue'

const router = useRouter()
const store = useAssessmentStore()
const showErrors = ref(false)
onMounted(() => store.loadConfig())

function next() {
  if (!store.demographicsComplete) {
    showErrors.value = true
    return
  }
  store.goTo(0)
  router.push({ name: 'assessment' })
}
</script>

<template>
  <AssessmentShell>
  <div class="wp-page page-enter">
    <DemoBanner />
    <p class="wp-eyebrow">Step 2 · About you</p>
    <h1 class="wp-title">Demographic information</h1>
    <p class="wp-text">Only the information needed for this research is requested.</p>

    <StateBlock :loading="store.configLoading" :error="store.configError || ''" @retry="store.loadConfig()">
      <form v-if="store.config" class="wp-card" novalidate @submit.prevent="next">
        <fieldset
          v-for="f in store.config.demographics"
          :key="f.id"
          style="border: none; padding: 0; margin: 0 0 22px;"
        >
          <template v-if="f.type === 'radio'">
            <legend class="wp-label">{{ f.label }}<span v-if="f.required" aria-hidden="true"> *</span></legend>
            <label v-for="o in f.options" :key="o.value" class="wp-option">
              <input type="radio" :name="f.id" :value="o.value" :checked="store.demographics[f.id] === o.value" @change="store.setDemographic(f.id, o.value)" />
              <span>{{ o.label }}</span>
            </label>
          </template>
          <template v-else>
            <label class="wp-label" :for="f.id">{{ f.label }}<span v-if="f.required" aria-hidden="true"> *</span></label>
            <select :id="f.id" class="wp-select" :value="store.demographics[f.id] ?? ''" @change="store.setDemographic(f.id, $event.target.value)">
              <option value="" disabled>Select…</option>
              <option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </template>
          <p v-if="showErrors && f.required && !store.demographics[f.id]" class="wp-error" role="alert">Please answer this question.</p>
        </fieldset>

        <div class="wp-actions">
          <button type="button" class="wp-btn" @click="router.push({ name: 'consent' })">Back</button>
          <button type="submit" class="wp-btn wp-btn-primary">Start questionnaire</button>
        </div>
      </form>
    </StateBlock>
  </div>
  </AssessmentShell>
</template>
