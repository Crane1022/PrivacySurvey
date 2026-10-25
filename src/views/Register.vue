<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '../components/ui/AuthLayout.vue'
import PasswordField from '../components/ui/PasswordField.vue'
import { useAuthStore } from '../stores/auth'
import { friendlyAuthError } from '../services/authService'
import { isEmail, passwordProblems, safeRedirect } from '../utils/validation'
import { config } from '../config'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const f = ref({ displayName: '', email: '', password: '', confirm: '', consent: false })
const errs = ref({})
const error = ref('')
const busy = ref(false)

function validate() {
  const e = {}
  if (f.value.displayName.trim().length < 2) e.displayName = 'Enter your name or a display name.'
  if (!isEmail(f.value.email)) e.email = 'Enter a valid email address.'
  const pw = passwordProblems(f.value.password)
  if (pw.length) e.password = `Password needs ${pw.join(', ')}.`
  if (f.value.confirm !== f.value.password) e.confirm = 'Passwords do not match.'
  if (!f.value.consent) e.consent = 'Please accept the participation notice to continue.'
  errs.value = e
  return !Object.keys(e).length
}
async function submit() {
  error.value = ''
  if (!validate()) return
  busy.value = true
  try {
    await auth.register({ displayName: f.value.displayName.trim(), email: f.value.email.trim(), password: f.value.password })
    router.replace(safeRedirect(route.query.redirect, '/dashboard').replace(/^\/staff.*/, '/dashboard'))
  } catch (e) {
    error.value = e.partial || config.isMock ? e.message : friendlyAuthError(e, 'register')
    if (e.partial) router.replace('/login')
  } finally { busy.value = false }
}
</script>

<template>
  <AuthLayout>
    <p class="wp-eyebrow rise">CREATE ACCOUNT</p>
    <h1 class="head rise" style="--d: .08s">Begin your <span class="serif-i">journey.</span></h1>
    <p class="wp-text rise" style="--d: .14s">An account keeps your results private and saved in your own dashboard.</p>
    <p v-if="config.isMock" class="wp-demo" role="note">Demonstration mode: no real account is created and passwords are not stored.</p>

    <form novalidate class="rise" style="--d: .2s" @submit.prevent="submit">
      <div class="wp-field">
        <label class="wp-label" for="name">Full name or display name</label>
        <input id="name" v-model="f.displayName" class="wp-input" autocomplete="name" :aria-invalid="!!errs.displayName" />
        <p v-if="errs.displayName" class="wp-fielderr" role="alert">{{ errs.displayName }}</p>
      </div>
      <div class="wp-field">
        <label class="wp-label" for="remail">Email address</label>
        <input id="remail" v-model="f.email" class="wp-input" type="email" autocomplete="email" :aria-invalid="!!errs.email" />
        <p v-if="errs.email" class="wp-fielderr" role="alert">{{ errs.email }}</p>
      </div>
      <PasswordField id="rpass" v-model="f.password" label="Password" autocomplete="new-password" :error="errs.password" />
      <PasswordField id="rconf" v-model="f.confirm" label="Confirm password" autocomplete="new-password" :error="errs.confirm" />
      <label class="chk">
        <input v-model="f.consent" type="checkbox" :aria-invalid="!!errs.consent" />
        <span>I agree to take part in this research and have read the privacy notice. Participation is voluntary. <em>(Final wording pending approval by the project team and supervisor.)</em></span>
      </label>
      <p v-if="errs.consent" class="wp-fielderr" role="alert">{{ errs.consent }}</p>
      <p v-if="error" class="wp-error" role="alert">{{ error }}</p>
      <button class="wp-btn wp-btn-primary full" :disabled="busy">{{ busy ? 'Creating account…' : 'Create Account' }}</button>
    </form>
    <p class="wp-text" style="text-align: center; margin-top: 18px;">Already registered? <router-link to="/login"><strong>Sign in</strong></router-link></p>
  </AuthLayout>
</template>

<style scoped>
.head { font-size: clamp(32px, 3.8vw, 44px); font-weight: 500; letter-spacing: -0.03em; line-height: 1.05; margin: 6px 0 10px; }
.head .serif-i { font-size: 1.08em; }
.chk { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; line-height: 1.5; color: var(--ink-soft); cursor: pointer; margin-bottom: 6px; }
.chk input { accent-color: var(--accent); width: 18px; height: 18px; margin-top: 2px; flex-shrink: 0; }
.full { width: 100%; padding: 14px; font-size: 15px; margin-top: 12px; }
</style>
