<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { config } from '../../config'
import Icon from '../ui/Icon.vue'
import PageHeader from '../ui/PageHeader.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const open = ref(false) // mobile drawer
const menu = ref(false)
const collapsed = ref(localStorage.getItem('wpsi_sidebar_collapsed') === '1') // UI preference only, never used for access
const query = ref('')

const ADMIN = [
  ['Overview', '/staff/dashboard', 'grid'], ['Import Survey', '/staff/import', 'upload'], ['Question Bank', '/staff/questions', 'list'], ['Questionnaire Management', '/staff/questionnaires', 'layers'],
  ['Demographic Questions', '/staff/demographic-questions', 'clipboard'], ['Survey Responses', '/staff/responses', 'inbox'],
  ['Privacy Profiling Results', '/staff/results', 'shield'], ['Research Analytics', '/staff/analytics', 'chart'],
  ['ML Model & Test Lab', '/staff/ml-info', 'cpu'], ['User & Role Management', '/staff/users', 'users'], ['System Settings', '/staff/settings', 'settings'],
]
const RESEARCHER = [
  ['Overview', '/staff/dashboard', 'grid'], ['Privacy Profiling Results', '/staff/results', 'shield'], ['Survey Analytics', '/staff/research/survey', 'list'],
  ['Demographic Insights', '/staff/research/demographics', 'users'], ['Privacy Segmentation', '/staff/research/segmentation', 'chart'],
  ['ML Model & Test Lab', '/staff/ml-info', 'cpu'], ['Clustering Analysis', '/staff/research/clusters', 'sparkle'], ['Reports', '/staff/research/reports', 'inbox'],
]
const items = computed(() => (auth.isAdmin ? ADMIN : RESEARCHER))
const found = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? items.value.filter(i => i[0].toLowerCase().includes(q)) : []
})
const crumbs = computed(() => [
  { label: 'Staff Portal', to: '/staff/dashboard' },
  { label: route.meta.title ?? '' },
])

watch(() => route.fullPath, () => { open.value = false; menu.value = false; query.value = '' })
function toggleCollapse() {
  collapsed.value = !collapsed.value
  localStorage.setItem('wpsi_sidebar_collapsed', collapsed.value ? '1' : '0')
}
function goFirst() { if (found.value[0]) router.push(found.value[0][1]) }
async function signOut() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="ad-shell">
    <a href="#main" class="skip">Skip to content</a>
    <div class="ad-overlay" :class="{ open }" @click="open = false"></div>

    <aside class="ad-side" :class="{ open, collapsed }" aria-label="Sidebar">
      <div class="ad-brand">
        <span class="mark" aria-hidden="true"><Icon name="shield" :size="17" /></span>
        <span class="lbl">{{ auth.isAdmin ? 'Admin Panel' : 'Research' }}</span>
      </div>
      <nav class="navlist">
        <router-link v-for="[label, to, icon] in items" :key="to" :to="to" class="ad-link" :title="collapsed ? label : undefined" :aria-label="label">
          <Icon :name="icon" />
          <span class="lbl">{{ label }}</span>
        </router-link>
      </nav>
      <button class="ad-link collapse-btn" :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'" @click="toggleCollapse">
        <Icon :name="collapsed ? 'right' : 'left'" /><span class="lbl">Collapse</span>
      </button>
    </aside>

    <div class="ad-main">
      <header class="ad-top">
        <div class="left">
          <button class="wp-btn ad-mini ad-burger" aria-label="Open menu" @click="open = true"><Icon name="menu" /></button>
          <div class="search">
            <Icon name="search" :size="16" />
            <input v-model="query" type="search" placeholder="Jump to a page…" aria-label="Jump to a page" @keydown.enter="goFirst" />
            <div v-if="query" class="results" role="listbox">
              <router-link v-for="f in found" :key="f[1]" :to="f[1]" role="option">{{ f[0] }}</router-link>
              <span v-if="!found.length" class="none">No matching page</span>
            </div>
          </div>
        </div>
        <div class="profile">
          <button class="wp-btn ad-mini" :aria-expanded="menu" aria-haspopup="menu" @click="menu = !menu">
            <span class="avatar" aria-hidden="true">{{ (auth.user?.email ?? '?')[0].toUpperCase() }}</span>
            <span class="who">{{ auth.user?.email }}</span><span class="chip" style="text-transform: capitalize;">{{ auth.role }}</span>
          </button>
          <div v-if="menu" class="ad-menu" role="menu">
            <router-link to="/" role="menuitem">View respondent site</router-link>
            <button role="menuitem" @click="signOut"><Icon name="logout" :size="15" /> Sign out</button>
          </div>
        </div>
      </header>

      <div v-if="config.isMock" class="wp-demo" style="margin: 14px 24px 0;" role="note">
        Local test mode (VITE_DATA_MODE=mock): data is stored only in this browser, not in Firestore.
      </div>
      <main id="main" class="ad-content">
        <PageHeader :title="route.meta.title ?? ''" :crumbs="crumbs" />
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.skip { position: absolute; left: -999px; top: 8px; background: white; padding: 8px 12px; border-radius: 8px; z-index: 300; }
.skip:focus { left: 8px; }
.mark { width: 32px; height: 32px; border-radius: 10px; background: var(--accent); color: var(--ink); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.navlist { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.ad-link { display: flex; align-items: center; gap: 10px; }
.collapse-btn { border: none; background: none; cursor: pointer; font: inherit; width: 100%; text-align: left; }
.ad-side { transition: width 0.2s ease; }
.ad-side.collapsed { width: 72px; }
.ad-side.collapsed .lbl { display: none; }
.ad-side.collapsed .ad-link, .ad-side.collapsed .ad-brand { justify-content: center; }
.left { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
.search { position: relative; display: flex; align-items: center; gap: 8px; background: var(--color-surface); border: 1.5px solid var(--color-border); border-radius: var(--radius-sm); padding: 0 10px; width: min(320px, 100%); color: var(--color-muted); }
.search input { border: none; background: none; outline: none; padding: 9px 0; width: 100%; font: inherit; font-size: 14px; color: var(--color-text); }
.search:focus-within { border-color: var(--color-primary); }
.results { position: absolute; top: 44px; left: 0; right: 0; background: white; border: 1px solid var(--color-border); border-radius: 12px; padding: 6px; box-shadow: var(--shadow-md); z-index: 70; }
.results a, .results .none { display: block; padding: 8px 10px; border-radius: 8px; font-size: 14px; color: var(--color-text); text-decoration: none; }
.results a:hover { background: var(--color-primary-light); }
.none { color: var(--color-muted) !important; }
.profile { position: relative; }
.profile .wp-btn { display: flex; align-items: center; gap: 8px; }
.avatar { width: 24px; height: 24px; border-radius: 50%; background: var(--color-accent-light); color: var(--color-accent); display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; }
.role { text-transform: capitalize; font-size: 12px; color: var(--color-muted); }
.ad-menu button { display: flex; align-items: center; gap: 8px; }
@media (max-width: 900px) {
  .ad-side.collapsed { width: 248px; }
  .ad-side.collapsed .lbl { display: inline; }
  .collapse-btn { display: none; }
  .who { display: none; }
}
</style>
