import { config } from '../config'
import { db, audit, clean, rid, C } from './core'
import { getSettings, getMlSchema } from './settingsService'
import { publishedDemographicSnapshot } from './demographicService'
import { useAuthStore } from '../stores/auth'
import { validateQuestion, snapshotQuestion, checkMlCompatibility } from '../utils/questions'

export async function listQuestionnaires() {
  const s = await db()
  return (await s.list(C.questionnaires)).sort((a, b) => b.version - a.version)
}

export async function createDraft({ title, description }) {
  const s = await db()
  const all = await s.list(C.questionnaires)
  const version = all.length ? Math.max(...all.map(x => x.version)) + 1 : 1
  const id = rid(`qn_v${version}`)
  await s.set(C.questionnaires, id, clean({
    questionnaireId: id, title, description: description ?? '', version, status: 'draft',
    demographics: [], // filled from the published demographic fields when previewing / publishing
    questions: [], createdAt: s.now(), updatedAt: s.now(), publishedAt: null,
  }))
  await audit('questionnaire.create', `questionnaires/${id}`, { version })
  return id
}

export async function saveDraft(id, { title, description, questions }) {
  const s = await db()
  const cur = await s.get(C.questionnaires, id)
  if (!cur) throw new Error('Questionnaire not found.')
  if (cur.status !== 'draft') throw new Error('Only drafts can be edited. Create a new version instead.')
  await s.update(C.questionnaires, id, clean({
    title, description, questions: questions.map((q, i) => snapshotQuestion(q, i + 1)), updatedAt: s.now(),
  }))
  await audit('questionnaire.save', `questionnaires/${id}`, { questions: questions.length })
}

export async function createNewVersionFrom(id) {
  const s = await db()
  const src = await s.get(C.questionnaires, id)
  if (!src) throw new Error('Questionnaire not found.')
  const all = await s.list(C.questionnaires)
  const version = Math.max(...all.map(x => x.version)) + 1
  const nid = rid(`qn_v${version}`)
  const { id: _omit, ...rest } = src
  await s.set(C.questionnaires, nid, clean({
    ...rest, questionnaireId: nid, version, status: 'draft', createdAt: s.now(), updatedAt: s.now(), publishedAt: null, archivedAt: null,
  }))
  await audit('questionnaire.new_version', `questionnaires/${nid}`, { from: id, version })
  return nid
}

// Re-snapshot a draft's questions from the bank so what is published equals what the admin last saved.
async function refreshedQuestions(qn) {
  const s = await db()
  const bank = Object.fromEntries((await s.list(C.questions)).map(q => [q.questionId, q]))
  const settings = await getSettings()
  const problems = []
  const questions = qn.questions.map((q, i) => {
    const b = bank[q.questionId]
    if (!b) { problems.push(`${q.questionId} no longer exists in the question bank.`); return q }
    if (b.status === 'archived') problems.push(`"${b.questionText}" is archived. Remove it or restore it in the Question Bank.`)
    const errs = validateQuestion(b, settings.enabledQuestionTypes)
    if (errs.length) problems.push(`"${b.questionText}": ${errs.join(' ')}`)
    return snapshotQuestion(b, i + 1)
  })
  return { questions, problems }
}

export async function previewConfigFor(qn) {
  const settings = await getSettings()
  const draft = qn.status === 'draft'
  return {
    isPreview: true, questionnaireId: qn.questionnaireId, questionnaireVersion: qn.version, title: qn.title,
    consentVersion: settings.consentVersion, surveyOpen: true,
    demographics: draft ? await publishedDemographicSnapshot() : qn.demographics,
    questions: draft ? (await refreshedQuestions(qn)).questions : qn.questions,
  }
}

export async function publishQuestionnaire(id) {
  const s = await db()
  const qn = await s.get(C.questionnaires, id)
  if (!qn || qn.status !== 'draft') throw new Error('Only a draft can be published.')
  if (!qn.questions.length) throw new Error('Add at least one question before publishing.')
  const demographics = await publishedDemographicSnapshot()
  const { questions, problems } = await refreshedQuestions(qn)
  if (!demographics.length) problems.push('There are no published demographic fields. Add and publish them under Demographic Questions.')
  const ml = checkMlCompatibility(questions, await getMlSchema())
  const all = [...problems, ...ml.problems]
  if (all.length) {
    const e = new Error(ml.ok ? 'Fix the issues below before publishing.' : 'Blocked: this questionnaire is not compatible with the locked ML feature schema.')
    e.problems = all
    throw e
  }
  const current = await s.queryOne(C.questionnaires, 'status', 'published')
  const ops = []
  if (current) ops.push({ op: 'update', col: C.questionnaires, id: current.id, data: { status: 'archived', archivedAt: s.now(), updatedAt: s.now() } })
  ops.push({ op: 'update', col: C.questionnaires, id, data: clean({ status: 'published', questions, demographics, publishedAt: s.now(), publishedBy: useAuthStore().user?.uid ?? null, updatedAt: s.now() }) })
  await s.batch(ops) // atomic: the old version is archived only if the new one is published
  await audit('questionnaire.publish', `questionnaires/${id}`, { version: qn.version, replaced: current?.version ?? null })
}

export async function archiveQuestionnaire(id) {
  const s = await db()
  await s.update(C.questionnaires, id, { status: 'archived', archivedAt: s.now(), updatedAt: s.now() })
  await audit('questionnaire.archive', `questionnaires/${id}`)
}

// The ONLY source of respondent-facing questions: the published questionnaire document.
export async function getPublishedSurveyConfig() {
  const s = await db()
  const settings = await getSettings()
  const qn = await s.queryOne(C.questionnaires, 'status', 'published')
  if (!qn) throw new Error('No questionnaire is currently published. Please check back later.')
  return {
    isDemo: config.isMock, questionnaireId: qn.questionnaireId, questionnaireVersion: qn.version, title: qn.title,
    consentVersion: settings.consentVersion, surveyOpen: settings.surveyOpen,
    demographics: qn.demographics, questions: qn.questions,
  }
}
