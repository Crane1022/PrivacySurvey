<script setup>
import { ref } from 'vue'
import AuthLayout from '../components/ui/AuthLayout.vue'
import { useAuthStore } from '../stores/auth'
import { friendlyAuthError } from '../services/authService'
import { isEmail } from '../utils/validation'

const auth = useAuthStore()
const email = ref('')
const err = ref('')
const done = ref(false)
const busy = ref(false)

async function submit() {
  err.value = ''
  if (!isEmail(email.value)) { err.value = 'Enter a valid email address.'; return }
  busy.value = true
  try {
    await auth.resetPassword(email.value.trim())
    done.value = true // same message whether or not the account exists
  } catch (e) { err.value = friendlyAuthError(e, 'register') } finally { busy.value = false }
}
</script>

<template>
  <AuthLayout>
    <p class="wp-eyebrow">PASSWORD RECOVERY</p>
    <h1 class="head">Reset your <span class="serif-i">password.</span></h1>
    <div v-if="done" class="wp-success" role="status">If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.</div>
    <form v-else novalidate @submit.prevent="submit">
      <p class="wp-text">Enter the email you registered with and we will send you a reset link.</p>
      <div class="wp-field">
        <label class="wp-label" for="fe">Email address</label>
        <input id="fe" v-model="email" class="wp-input" type="email" autocomplete="email" :aria-invalid="!!err" />
        <p v-if="err" class="wp-fielderr" role="alert">{{ err }}</p>
      </div>
      <button class="wp-btn wp-btn-primary" style="width: 100%; padding: 14px;" :disabled="busy">{{ busy ? 'Sending…' : 'Send reset link' }}</button>
    </form>
    <p class="wp-text" style="text-align: center; margin-top: 18px;"><router-link to="/login">← Back to sign in</router-link></p>
  </AuthLayout>
</template>

<style scoped>
.head { font-size: clamp(30px, 3.6vw, 42px); font-weight: 500; letter-spacing: -0.03em; line-height: 1.05; margin: 6px 0 14px; }
.head .serif-i { font-size: 1.08em; }
</style>
