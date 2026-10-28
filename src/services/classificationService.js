// Runs the classifier for a saved response and stores the result in privacy_results.
//   classifierMode 'local' → the test classifier in src/ml runs in the browser (results are marked source: 'browser-test')
//   classifierMode 'api'   → the FastAPI backend does it (POST /api/survey/classify) and writes the result itself
import { config } from '../config'
import { apiRequest } from './api'
import { db, audit, clean, C } from './core'
import { useAuthStore } from '../stores/auth'
import { classify, withDefaults } from '../ml'

const SETTINGS_ID = 'ml_model'
export const resultIdFor = responseId => `res_${responseId}`

export async function getModelConfig() {
  const s = await db()
  return withDefaults(await s.get(C.settings, SETTINGS_ID))
}

export async function saveModelConfig(cfg) {
  const s = await db()
  const current = await getModelConfig()
  const data = clean({
    activeModel: cfg.activeModel,
    version: (current.version ?? 1) + 1,
    thresholds: { fundamentalist: Number(cfg.thresholds.fundamentalist), unconcerned: Number(cfg.thresholds.unconcerned) },
    questions: Object.fromEntries(Object.entries(cfg.questions).map(([id, q]) => [id, clean({ weight: Number(q.weight) || 0, concernEnd: q.concernEnd === 'last' ? 'last' : 'first', note: q.note || undefined })])),
    westinCoreItems: cfg.westinCoreItems,
    updatedAt: s.now(),
    updatedBy: useAuthStore().user?.email ?? '',
  })
  if (!(data.thresholds.unconcerned < data.thresholds.fundamentalist)) throw new Error('The Unconcerned threshold must be lower than the Fundamentalist threshold.')
  await s.set(C.settings, SETTINGS_ID, data)
  await audit('ml_model.save', `system_settings/${SETTINGS_ID}`, { activeModel: data.activeModel, version: data.version })
  return data.version
}

function resultDoc(s, response, out) {
  return clean({
    resultId: resultIdFor(response.responseId),
    respondentId: response.respondentId,
    responseId: response.responseId,
    questionnaireId: response.questionnaireId,
    questionnaireVersion: response.questionnaireVersion,
    classification: out.classification,
    score: out.score,
    confidence: null, // the test classifier has no probability; a trained model may fill this in
    modelId: out.modelId,
    modelVersion: out.modelVersion,
    explanation: out.explanation,
    source: 'browser-test',
    createdAt: s.now(),
  })
}

async function runFor(response) {
  const s = await db()
  const qn = await s.get(C.questionnaires, response.questionnaireId)
  if (!qn) throw new Error('The questionnaire for this response could not be loaded.')
  const out = classify({ questions: qn.questions, answers: response.answers, config: await getModelConfig() })
  return resultDoc(s, response, out)
}

// Respondent: classify my own saved response (called right after submitting, and by "Check for my result").
export async function classifyMyResponse(responseId) {
  const auth = useAuthStore()
  if (config.classifierMode === 'api') {
    await apiRequest('/api/survey/classify', { method: 'POST', body: { responseId }, token: await auth.getToken() })
    return
  }
  const s = await db()
  const uid = auth.user.uid
  const [existing] = await s.query('privacy_results', [['respondentId', '==', uid], ['responseId', '==', responseId]], { limit: 1 })
  if (existing) return existing // never create a second result for the same response
  const response = await s.get(C.responses, responseId)
  if (!response || response.respondentId !== uid) throw new Error('This assessment could not be found in your account.')
  const doc = await runFor(response)
  await s.set('privacy_results', doc.resultId, doc)
  return doc
}

// Admin: re-run the current model on every saved response (e.g. after changing weights). Returns counts.
export async function reclassifyAll(onProgress) {
  const s = await db()
  const responses = await s.list(C.responses)
  let done = 0, failed = 0
  for (const r of responses) {
    try {
      const doc = await runFor(r)
      await s.set('privacy_results', doc.resultId, doc)
      done++
    } catch { failed++ }
    onProgress?.(done + failed, responses.length)
  }
  await audit('ml_model.reclassify', 'privacy_results', { done, failed })
  return { done, failed, total: responses.length }
}
