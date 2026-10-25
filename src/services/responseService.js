import { config } from '../config'
import { apiRequest } from './api'
import { db, audit, clean, C } from './core'
import { useAuthStore } from '../stores/auth'

// MOCK MODE ONLY: keeps a local copy so the dashboards can be tried offline. The "result" written here is a fixed,
// clearly flagged DEMONSTRATION sample (isDemo) and is not a prediction. Live mode never does this.
export async function saveMockResponse(p, user) {
  const s = await db()
  const qn = await s.get(C.questionnaires, p.questionnaireId)
  await s.set(C.responses, p.clientSubmissionId, clean({
    responseId: p.clientSubmissionId, respondentId: user.uid, questionnaireId: p.questionnaireId, questionnaireVersion: p.questionnaireVersion,
    consentVersion: p.consentVersion, consentGiven: true, demographics: p.demographics, answers: toAnswerList(p.answers),
    questionSnapshot: qn?.questions ?? null, demographicsSnapshot: qn?.demographics ?? null,
    status: 'submitted', isMockData: true, submittedAt: s.now(),
  }))
  await s.set('privacy_results', `demo_${p.clientSubmissionId}`, clean({
    resultId: `demo_${p.clientSubmissionId}`, respondentId: user.uid, responseId: p.clientSubmissionId,
    questionnaireVersion: p.questionnaireVersion, classification: 'Privacy Pragmatist', modelVersion: 'demonstration-only',
    confidence: null, explanation: null, isDemo: true, createdAt: s.now(),
  }))
}

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
