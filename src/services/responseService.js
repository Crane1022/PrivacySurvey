import { config } from '../config'
import { apiRequest } from './api'
import { db, audit, C } from './core'
import { useAuthStore } from '../stores/auth'

// Stored answer format: [{ questionId, selectedOptionId } | { questionId, selectedOptionIds }]
export function toAnswerList(answers) {
  return Object.entries(answers).map(([questionId, v]) =>
    Array.isArray(v) ? { questionId, selectedOptionIds: v } : { questionId, selectedOptionId: v })
}
export async function listResponses(limit = 200) {
  const s = await db()
  return s.list(C.responses, { orderBy: 'submittedAt', limit })
}
export async function listAudit(limit = 50) {
  const s = await db()
  return s.list(C.audit, { orderBy: 'createdAt', limit })
}
export async function listUsers() {
  const s = await db()
  return s.list(C.users)
}
// Roles are changed by the trusted backend (custom claims), never by client-side writes.
export async function setUserRole(uid, role) {
  if (config.isMock) {
    const s = await db()
    await s.update(C.users, uid, { role })
  } else {
    const token = await useAuthStore().getToken()
    await apiRequest(`/api/admin/users/${encodeURIComponent(uid)}/role`, { method: 'PUT', body: { role }, token })
  }
  await audit('user.role', `users/${uid}`, { role })
}
