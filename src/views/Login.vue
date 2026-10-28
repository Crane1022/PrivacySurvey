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
const remember = ref(true)
const busy = ref(false)
const error = ref('')
const errs = ref({})

async function submit() {
  error.value = ''
  errs.value = {}
  if (!isEmail(email.value)) errs.value.email = 'Enter a valid email address.'
  if (!config.isMock && !password.value) errs.value.password = 'Enter your password.'
  if (Object.keys(errs.value).length) return
  busy.value = true
  try {
    const role = await auth.login(email.value.trim(), password.value, { remember: remember.value })
    if (role === 'admin' || role === 'researcher') return router.replace('/staff/dashboard') // staff are sent to the staff portal
    const dest = safeRedirect(route.query.redirect, '/dashboard')
    router.replace(dest.startsWith('/staff') ? '/dashboard' : dest)
  } catch (e) {
    error.value = config.isMock ? e.message : friendlyAuthError(e)
  } finally { busy.value = false }
}
</script>

<template>
  <AuthLayout>
    <p class="wp-eyebrow rise">RESPONDENT LOGIN</p>
    <h1 class="head rise" style="--d: .08s">Welcome <span class="serif-i">back.</span></h1>
    <p class="wp-text rise" style="--d: .14s">Sign in to continue your privacy journey.</p>

    <p v-if="config.isMock" class="wp-demo" role="note">Local test mode: passwords are not checked and no real account is created.</p>
    <p v-if="route.query.redirect" class="wp-text" style="font-size: 13px;">Please sign in to continue to your assessment.</p>

    <form novalidate class="rise" style="--d: .2s" @submit.prevent="submit">
      <div class="wp-field">
        <label class="wp-label" for="email">Email address</label>
        <input id="email" v-model="email" class="wp-input" type="email" autocomplete="username" :aria-invalid="!!errs.email" />
        <p v-if="errs.email" class="wp-fielderr" role="alert">{{ errs.email }}</p>
      </div>
      <PasswordField id="password" v-model="password" label="Password" autocomplete="current-password" :error="errs.password" />
      <div class="row">
        <label class="chk"><input v-model="remember" type="checkbox" /> Remember me</label>
        <router-link to="/forgot-password">Forgot password?</router-link>
      </div>
      <p v-if="error" class="wp-error" role="alert">{{ error }}</p>
      <button class="wp-btn wp-btn-primary full" :disabled="busy">{{ busy ? 'Signing in…' : 'Sign In' }}</button>
    </form>

    <p class="wp-text rise" style="--d: .26s; text-align: center;">Don't have an account? <router-link to="/register"><strong>Create Account</strong></router-link></p>
    <hr class="sep" />
    <p class="staff">Are you a researcher or administrator? <router-link to="/staff/login">Staff Login →</router-link></p>
  </AuthLayout>
</template>

<style scoped>
.head { font-size: clamp(34px, 4vw, 46px); font-weight: 500; letter-spacing: -0.03em; line-height: 1.05; margin: 6px 0 10px; }
.head .serif-i { font-size: 1.08em; }
.row { display: flex; justify-content: space-between; align-items: center; margin: -4px 0 14px; font-size: 14px; }
.chk { display: inline-flex; gap: 8px; align-items: center; color: var(--ink-soft); cursor: pointer; }
.chk input { accent-color: var(--accent); width: 16px; height: 16px; }
.full { width: 100%; padding: 14px; font-size: 15px; }
.sep { border: none; border-top: 1px solid var(--border); margin: 22px 0 16px; }
.staff { font-size: 14px; text-align: center; color: var(--ink-soft); margin: 0; }
</style>
