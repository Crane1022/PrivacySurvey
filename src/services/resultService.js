import { config } from '../config'
import { apiRequest } from './api'
import { db, C } from './core'
import { useAuthStore } from '../stores/auth'

const byDateDesc = f => (a, b) => (String(a[f] ?? '') < String(b[f] ?? '') ? 1 : -1)

// A respondent's own response + result for one submission.
// result === null means "no classification stored yet" (pending). The frontend never creates a category.
export async function getMyOutcome(responseId) {
  const s = await db()
  const uid = useAuthStore().user.uid
  const response = await s.get(C.responses, responseId)
  if (!response || response.respondentId !== uid) throw new Error('This assessment could not be found in your account.')
  const [result] = await s.query('privacy_results', [['respondentId', '==', uid], ['responseId', '==', responseId]], { limit: 1 })
  return { response, result: result ?? null }
}

// Asks the trusted backend to (re)run classification for a saved response. The backend validates the response,
// runs the approved model and writes privacy_results. Mock mode has nothing to request.
export async function requestClassification(responseId) {
  if (config.isMock) return
  const token = await useAuthStore().getToken()
  await apiRequest('/api/survey/classify', { method: 'POST', body: { responseId }, token })
}

export async function listMyHistory() {
  const s = await db()
  const uid = useAuthStore().user.uid
  const [responses, results] = await Promise.all([
    s.query(C.responses, [['respondentId', '==', uid]]),
    s.query('privacy_results', [['respondentId', '==', uid]]),
  ])
  const byResponse = Object.fromEntries(results.map(r => [r.responseId, r]))
  return responses.sort(byDateDesc('submittedAt')).map(r => ({ ...r, result: byResponse[r.responseId] ?? null }))
}

// Staff: stored classifications (pseudonymous respondent ids; no names or emails).
export async function listAllResults(limit = 500) {
  const s = await db()
  return s.list('privacy_results', { orderBy: 'createdAt', limit })
}
