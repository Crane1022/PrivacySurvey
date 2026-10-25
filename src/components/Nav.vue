<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Icon from './ui/Icon.vue'

defineProps({ embedded: Boolean })
const router = useRouter()
const auth = useAuthStore()
const open = ref(false)
auth.init().catch(() => {})

const home = computed(() => (auth.isStaff ? '/staff/dashboard' : '/dashboard'))
function go(to) { open.value = false; router.push(to) }
async function logout() { open.value = false; await auth.logout(); router.push({ name: 'landing' }) }
</script>

<template>
  <header class="hd" :class="{ embedded }">
    <button class="brand" @click="go({ name: 'landing' })">
      <span class="mark" aria-hidden="true"><Icon name="shield" :size="16" /></span>
      <span>Privacy Profiling <span class="serif-i">System</span></span>
    </button>
    <button class="burger" :aria-expanded="open" aria-label="Toggle menu" @click="open = !open"><Icon name="menu" /></button>
    <nav :class="{ open }" aria-label="Main">
      <button class="nl" @click="go({ name: 'landing', hash: '#about' })">About</button>
      <button class="nl" @click="go({ name: 'landing', hash: '#how-it-works' })">How It Works</button>
      <template v-if="auth.isAuthed">
        <button class="nl" @click="go(home)">{{ auth.isStaff ? 'Staff Portal' : 'My Dashboard' }}</button>
        <button class="wp-btn ad-mini" @click="logout">Log out</button>
      </template>
      <template v-else>
        <button class="nl" @click="go('/login')">Login</button>
        <button class="wp-btn wp-btn-primary ad-mini" @click="go('/register')">Register</button>
      </template>
    </nav>
  </header>
</template>

<style scoped>
.hd { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 12px 24px; background: rgba(248, 230, 221, 0.9); backdrop-filter: blur(16px); }
.hd.embedded { position: static; background: none; backdrop-filter: none; padding: 0; }
.brand { display: flex; align-items: center; gap: 10px; background: none; border: none; cursor: pointer; font: 600 16px var(--font-sans); letter-spacing: -0.01em; color: var(--ink); padding: 0; }
.brand .serif-i { font-size: 1.12em; }
.mark { width: 34px; height: 34px; border-radius: 10px; background: var(--forest); color: white; display: inline-flex; align-items: center; justify-content: center; }
nav { display: flex; align-items: center; gap: 4px; }
.nl { padding: 8px 12px; border-radius: 10px; background: transparent; border: none; color: var(--ink-soft); font: 500 14px var(--font-sans); cursor: pointer; }
.nl:hover { background: rgba(21, 22, 21, 0.06); color: var(--ink); }
.burger { display: none; background: white; border: 1.5px solid var(--border); border-radius: 10px; padding: 7px 9px; cursor: pointer; color: var(--ink); }
@media (max-width: 860px) {
  .burger { display: inline-flex; }
  nav { display: none; width: 100%; flex-direction: column; align-items: stretch; padding: 8px 0; }
  nav.open { display: flex; }
}
</style>
