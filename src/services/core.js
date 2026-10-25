// Shared plumbing for the Firestore-backed services (live) and the browser demo store (mock).
import { config } from '../config'
import { getStore } from './dataStore'
import { useAuthStore } from '../stores/auth'

export const C = {
  questions: 'survey_questions', questionnaires: 'questionnaires', demographics: 'demographic_questions',
  responses: 'survey_responses', audit: 'admin_audit_logs', settings: 'system_settings', users: 'users',
}
export const rid = p => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

// Drops undefined (Firestore rejects it) but leaves special values such as serverTimestamp() untouched.
export function clean(v) {
  if (Array.isArray(v)) return v.map(clean)
  if (v && Object.getPrototypeOf(v) === Object.prototype) {
    return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, clean(x)]))
  }
  return v
}

let seeded
// Returns the data store. In mock mode the first call seeds DEMONSTRATION content (never in live mode).
export async function db() {
  const s = await getStore()
  if (config.isMock && !seeded) {
    seeded = import('./mockSeed').then(m => m.seedMock(s))
    await seeded
  }
  return s
}

// Append-only audit entry for admin actions (actor comes from the verified auth state).
export async function audit(action, target, details = {}) {
  const s = await db()
  const a = useAuthStore()
  await s.set(C.audit, rid('a'), clean({
    action, target, details, actorUid: a.user?.uid ?? 'unknown', actorEmail: a.user?.email ?? '', createdAt: s.now(),
  }))
}
