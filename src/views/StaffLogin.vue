<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '../components/ui/AuthLayout.vue'
import PasswordField from '../components/ui/PasswordField.vue'
import { useAuthStore } from '../stores/auth'
import { friendlyAuthError } from '../services/authService'
import { isEmail, safeRedirect } from '../utils/validation'
import { config } from '../config'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')

function go() {
  const d = safeRedirect(route.query.redirect, '/staff/dashboard')
  router.replace(d.startsWith('/staff') ? d : '/staff/dashboard')
}

async function submit() {
  error.value = ''
  if (!isEmail(email.value) || !password.value) { error.value = 'Enter your staff email and password.'; return }
  busy.value = true
  try {
    const role = await auth.login(email.value.trim(), password.value, { remember: false })
    if (role !== 'admin' && role !== 'researcher') {
      await auth.logout()
      error.value = 'This is not a staff account. Respondents should use the respondent login.'
      return
    }
    go()
  } catch (e) { error.value = friendlyAuthError(e) } finally { busy.value = false }
}
function demo(role) { auth.mockLogin(role); go() }
</script>

<template>
  <AuthLayout staff>
    <p class="wp-eyebrow">STAFF ACCESS</p>
    <h1 class="head">Staff <span class="serif-i">sign in.</span></h1>
    <p class="wp-text">For approved researchers and administrators. Accounts are created by the project administrator.</p>

    <div v-if="config.isMock" class="wp-card" style="padding: 18px;">
      <p class="wp-demo" role="note">Demonstration mode: no real authentication. This option does not exist in live mode.</p>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <button class="wp-btn wp-btn-primary" @click="demo('admin')">Continue as demo admin</button>
        <button class="wp-btn" @click="demo('researcher')">Continue as demo researcher</button>
      </div>
    </div>

    <form v-else novalidate @submit.prevent="submit">
      <div class="wp-field">
        <label class="wp-label" for="semail">Staff email</label>
        <input id="semail" v-model="email" class="wp-input" type="email" autocomplete="username" />
      </div>
      <PasswordField id="spass" v-model="password" label="Password" autocomplete="current-password" />
      <p v-if="error" class="wp-error" role="alert">{{ error }}</p>
      <button class="wp-btn wp-btn-primary" style="width: 100%; padding: 14px;" :disabled="busy">{{ busy ? 'Signing in…' : 'Sign in to workspace' }}</button>
    </form>
    <p class="wp-text" style="text-align: center; margin-top: 20px; font-size: 14px;">Not a staff member? <router-link to="/login">Return to Respondent Login</router-link></p>
  </AuthLayout>
</template>

<style scoped>
.head { font-size: clamp(30px, 3.6vw, 42px); font-weight: 500; letter-spacing: -0.03em; line-height: 1.05; margin: 6px 0 12px; }
.head .serif-i { font-size: 1.08em; }
</style>
