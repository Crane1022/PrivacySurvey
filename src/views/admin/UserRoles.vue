<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import StateBlock from '../../components/common/StateBlock.vue'
import ConfirmModal from '../../components/common/ConfirmModal.vue'
import Pagination from '../../components/ui/Pagination.vue'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import * as admin from '../../services/adminService'

const auth = useAuthStore()
const toast = useToastStore()
const rows = ref([])
const loading = ref(true)
const error = ref('')
const tab = ref('respondent')
const q = ref('')
const page = ref(1)
const pending = ref(null)
const busy = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try { rows.value = await admin.listUsers() } catch (e) { error.value = e.message } finally { loading.value = false }
}
onMounted(load)

const shown = computed(() => rows.value
  .filter(u => (tab.value === 'respondent' ? (u.role ?? 'respondent') === 'respondent' : u.role === 'admin' || u.role === 'researcher'))
  .filter(u => !q.value || `${u.displayName} ${u.email}`.toLowerCase().includes(q.value.toLowerCase())))
watch([tab, q], () => { page.value = 1 })
const pageRows = computed(() => shown.value.slice((page.value - 1) * 10, page.value * 10))
const fmt = v => (v ? new Date(v).toLocaleString() : '-')

async function apply() {
  busy.value = true
  try {
    await admin.setUserRole(pending.value.user.uid, pending.value.role)
    toast.success('Role updated. The user must sign in again for it to take effect.')
    pending.value = null
    await load()
  } catch (e) { toast.error(e.message) } finally { busy.value = false }
}
</script>

<template>
  <div>
    <div class="wp-card">
      <p class="wp-text" style="margin: 0;">
        Identifiable details are visible to administrators only. Staff roles are Firebase custom claims that only the trusted backend or
        <code>scripts/set-role.mjs</code> can change; there is no way to promote an account from the browser's own data.
      </p>
    </div>
    <div class="ad-toolbar">
      <button class="wp-btn ad-mini" :class="{ 'wp-btn-primary': tab === 'respondent' }" @click="tab = 'respondent'">Respondents</button>
      <button class="wp-btn ad-mini" :class="{ 'wp-btn-primary': tab === 'staff' }" @click="tab = 'staff'">Staff</button>
      <input v-model="q" class="ad-input" style="flex: 1; min-width: 180px;" placeholder="Search name or email" aria-label="Search users" />
    </div>
    <StateBlock :loading="loading" :error="error" :empty="!shown.length" :empty-text="tab === 'respondent' ? 'No respondents have registered yet.' : 'No staff accounts recorded.'" @retry="load">
      <div class="ad-tablewrap">
        <table class="ad-table">
          <thead v-if="tab === 'respondent'"><tr><th>Respondent</th><th>Email</th><th>Registered</th><th>Assessment</th><th>Last login</th></tr></thead>
          <thead v-else><tr><th>Name / email</th><th>UID</th><th>Role</th><th>Change role</th></tr></thead>
          <tbody v-if="tab === 'respondent'">
            <tr v-for="u in pageRows" :key="u.uid">
              <td>{{ u.displayName }}</td><td>{{ u.email }}</td><td>{{ fmt(u.createdAt) }}</td>
              <td><span class="ad-badge" :class="u.assessmentCompleted ? 'b-published' : 'b-draft'">{{ u.assessmentCompleted ? 'Completed' : 'Pending' }}</span></td>
              <td>{{ fmt(u.lastLoginAt) }}</td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr v-for="u in pageRows" :key="u.uid">
              <td>{{ u.displayName || '' }} {{ u.email }}</td><td><code>{{ u.uid }}</code></td><td>{{ u.role }}</td>
              <td>
                <select class="ad-input" :disabled="u.uid === auth.user?.uid" :aria-label="'Role for ' + u.email" :value="u.role" @change="pending = { user: u, role: $event.target.value }; $event.target.value = u.role">
                  <option value="researcher">researcher</option><option value="admin">admin</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination v-model:page="page" :total="shown.length" />
    </StateBlock>
    <ConfirmModal v-if="pending" :busy="busy" title="Change role?" confirm-text="Change role" danger :message="`${pending.user.email} will become: ${pending.role}.`" @cancel="pending = null" @confirm="apply" />
  </div>
</template>
