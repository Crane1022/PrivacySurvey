<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAssessmentStore } from '../stores/assessment'
import { useToastStore } from '../stores/toast'
import { listMyHistory } from '../services/resultService'
import { WPSI_CATEGORIES } from '../utils/wpsi'
import StateBlock from '../components/common/StateBlock.vue'
import Icon from '../components/ui/Icon.vue'
import DemoBanner from '../components/common/DemoBanner.vue'
import { config } from '../config'

const router = useRouter()
const auth = useAuthStore()
const assessment = useAssessmentStore()
const toast = useToastStore()
assessment.restore()

const history = ref([])
const loading = ref(true)
const error = ref('')
const name = ref(auth.user?.displayName ?? '')
const savingName = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try { history.value = await listMyHistory() } catch (e) { error.value = e.message } finally { loading.value = false }
}
onMounted(load)

const inProgress = computed(() => assessment.consentGiven && !assessment.isPreview && Object.keys(assessment.answers).length > 0)
const latest = computed(() => history.value[0] ?? null)
const latestResult = computed(() => history.value.find(h => h.result)?.result ?? null)
const meta = computed(() => WPSI_CATEGORIES[latestResult.value?.classification])
const fmt = v => (v ? new Date(v).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '-')
const statusText = computed(() => (inProgress.value ? 'In progress' : latest.value ? 'Completed' : 'Not started'))

const start = () => router.push({ name: inProgress.value ? 'assessment' : 'consent' })
async function rename() {
  if (name.value.trim().length < 2) return toast.error('Enter a name of at least 2 characters.')
  savingName.value = true
  try { await auth.renameSelf(name.value.trim()); toast.success('Name updated.') } catch (e) { toast.error(e.message) } finally { savingName.value = false }
}
async function resend() {
  try { await auth.resendVerification(); toast.success('Verification email sent.') } catch (e) { toast.error(e.message) }
}
async function resetPw() {
  try { await auth.resetPassword(auth.user.email); toast.success('If your account supports it, a reset link has been emailed.') } catch (e) { toast.error(e.message) }
}
async function logout() { await auth.logout(); router.push({ name: 'landing' }) }
</script>

<template>
  <div class="dash">
    <DemoBanner />
    <header class="top rise">
      <div>
        <p class="wp-eyebrow">YOUR DASHBOARD</p>
        <h1>Welcome, <span class="serif-i">{{ auth.user?.displayName || 'there' }}.</span></h1>
      </div>
      <button class="wp-btn" @click="logout"><Icon name="logout" :size="16" /> Log out</button>
    </header>

    <div v-if="!config.isMock && auth.user && !auth.user.emailVerified" class="wp-demo" role="note">
      Your email is not verified yet. <button class="link" @click="resend">Resend verification email</button>
    </div>
    <p v-if="auth.profileError" class="wp-error" role="alert">Your profile could not be synced: {{ auth.profileError }}</p>

    <div class="grid">
      <section class="wp-card status rise" style="--d: .08s">
        <p class="wp-eyebrow">ASSESSMENT STATUS</p>
        <p class="big">{{ statusText }}</p>
        <p class="wp-text">
          <template v-if="inProgress">You have saved answers waiting. Pick up where you left off.</template>
          <template v-else-if="latest">Last completed on {{ fmt(latest.submittedAt) }}. You can take the assessment again at any time; every submission is kept in your history.</template>
          <template v-else>You have not taken the assessment yet. It takes a few minutes.</template>
        </p>
        <button class="wp-btn wp-btn-primary" @click="start">{{ inProgress ? 'Continue Assessment' : latest ? 'Start a New Assessment' : 'Start Assessment' }} <Icon name="arrow" :size="15" /></button>
      </section>

      <section class="wp-card profile rise" style="--d: .14s" :style="meta ? { background: meta.bg, borderColor: 'transparent' } : {}">
        <p class="wp-eyebrow">YOUR LATEST PRIVACY PROFILE</p>
        <template v-if="latestResult">
          <p class="big" :style="{ color: meta?.color }">{{ latestResult.classification }}</p>
          <p v-if="latestResult.source === 'browser-test'" class="chip">From the test classifier, not the final trained model</p>
          <p class="wp-text">{{ meta?.desc }}</p>
          <router-link class="wp-btn" :to="{ name: 'result', params: { id: latestResult.responseId } }">View full result</router-link>
        </template>
        <template v-else>
          <p class="big muted">No profile yet</p>
          <p class="wp-text">{{ latest ? 'Your latest submission is saved. Its classification is still pending.' : 'Complete the assessment to discover your privacy perspective.' }}</p>
          <router-link v-if="latest" class="wp-btn" :to="{ name: 'result', params: { id: latest.responseId } }">Check status</router-link>
        </template>
      </section>
    </div>

    <section class="wp-card rise" style="--d: .2s">
      <h2>Assessment history</h2>
      <StateBlock :loading="loading" :error="error" :empty="!history.length" empty-text="Nothing here yet. Your completed assessments will appear in this list." @retry="load">
        <div class="ad-tablewrap">
          <table class="ad-table">
            <thead><tr><th>Date</th><th>Questionnaire</th><th>Result</th><th></th></tr></thead>
            <tbody>
              <tr v-for="h in history" :key="h.responseId">
                <td>{{ fmt(h.submittedAt) }}</td><td>v{{ h.questionnaireVersion }}</td>
                <td>{{ h.result ? h.result.classification : 'Pending' }}<span v-if="h.result?.source === 'browser-test'" class="chip" style="margin-left: 6px;" title="Made by the test classifier, not the final trained model">test model</span></td>
                <td><router-link :to="{ name: 'result', params: { id: h.responseId } }">Open</router-link></td>
              </tr>
            </tbody>
          </table>
        </div>
      </StateBlock>
    </section>

    <section class="wp-card rise" style="--d: .26s">
      <h2>Account settings</h2>
      <div class="acct">
        <div class="wp-field" style="flex: 1; min-width: 220px;">
          <label class="wp-label" for="dn">Display name</label>
          <div style="display: flex; gap: 8px;"><input id="dn" v-model="name" class="wp-input" /><button class="wp-btn" :disabled="savingName" @click="rename">Save</button></div>
        </div>
        <div class="wp-field" style="flex: 1; min-width: 220px;">
          <span class="wp-label">Email</span><p class="wp-text" style="margin: 10px 0 0;">{{ auth.user?.email }}</p>
        </div>
      </div>
      <button class="wp-btn" @click="resetPw"><Icon name="mail" :size="16" /> Email me a password reset link</button>
    </section>
  </div>
</template>

<style scoped>
.dash { max-width: 1040px; margin: 0 auto; padding: 32px 20px 60px; }
.top { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; margin-bottom: 22px; }
h1 { font-size: clamp(30px, 4vw, 44px); font-weight: 500; letter-spacing: -0.03em; margin: 6px 0 0; line-height: 1.05; }
h1 .serif-i { font-size: 1.08em; }
h2 { font-size: 20px; font-weight: 600; margin: 0 0 14px; letter-spacing: -0.02em; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 4px; }
.big { font-size: 28px; font-weight: 500; letter-spacing: -0.02em; margin: 6px 0 10px; }
.muted { color: var(--ink-soft); }
.acct { display: flex; gap: 18px; flex-wrap: wrap; }
.link { background: none; border: none; text-decoration: underline; cursor: pointer; font: inherit; color: inherit; padding: 0; }
@media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
</style>
