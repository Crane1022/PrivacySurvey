import { db, audit, clean, C } from './core'
import { useAuthStore } from '../stores/auth'
import { DEFAULT_ENABLED_TYPES, schemaFromQuestions } from '../utils/questions'

export const DEFAULT_SETTINGS = { surveyOpen: true, consentVersion: 'v1-draft', enabledQuestionTypes: DEFAULT_ENABLED_TYPES }

export async function getSettings() {
  const s = await db()
  return { ...DEFAULT_SETTINGS, ...((await s.get(C.settings, 'app')) ?? {}) }
}
export async function saveSettings(v) {
  const s = await db()
  const data = clean({ surveyOpen: !!v.surveyOpen, consentVersion: v.consentVersion, enabledQuestionTypes: v.enabledQuestionTypes, updatedAt: s.now() })
  await s.set(C.settings, 'app', data)
  await audit('settings.update', 'system_settings/app', { surveyOpen: data.surveyOpen, consentVersion: data.consentVersion })
}
export async function getMlSchema() {
  const s = await db()
  return (await s.get(C.settings, 'ml_schema')) ?? { locked: false, features: {} }
}
export async function lockMlSchemaToPublished() {
  const s = await db()
  const pub = await s.queryOne(C.questionnaires, 'status', 'published')
  if (!pub) throw new Error('Publish a questionnaire first; the schema is captured from it.')
  await s.set(C.settings, 'ml_schema', clean({
    locked: true, features: schemaFromQuestions(pub.questions), lockedFromVersion: pub.version,
    lockedBy: useAuthStore().user?.email ?? '', updatedAt: s.now(),
  }))
  await audit('ml_schema.lock', 'system_settings/ml_schema', { version: pub.version })
}
export async function unlockMlSchema() {
  const s = await db()
  await s.set(C.settings, 'ml_schema', { locked: false, features: {}, updatedAt: s.now() })
  await audit('ml_schema.unlock', 'system_settings/ml_schema')
}
