// Saves an import model to the database: question bank + demographic fields (+ classifier settings and a draft questionnaire).
import { db, audit, clean, C } from '../services/core'
import { createDraft, saveDraft } from '../services/questionnaireService'
import { getModelConfig, saveModelConfig } from '../services/classificationService'
import { readDocx, parseSurveyParagraphs } from './parseDocx'
import { csvToModel } from './csv'

// File → raw import model (not yet finalized).
export async function parseImportFile(file) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.docx')) return parseSurveyParagraphs(await readDocx(await file.arrayBuffer()))
  if (name.endsWith('.csv')) return csvToModel(await file.text())
  if (name.endsWith('.json')) {
    const j = JSON.parse(await file.text())
    if (!Array.isArray(j.questions)) throw new Error('The JSON file needs a "questions" list.')
    return { demographics: j.demographics ?? [], questions: j.questions, warnings: [] }
  }
  throw new Error('Please choose a .docx, .csv or .json file.')
}

const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))

// model must come from finalizeModel(). Options: { archiveOthers, createQuestionnaire, title }
export async function applyImport(model, { archiveOthers = true, createQuestionnaire = true, title } = {}) {
  const s = await db()
  const [oldQ, oldD] = await Promise.all([s.list(C.questions), s.list(C.demographics)])
  const created = Object.fromEntries([...oldQ, ...oldD].map(x => [x.questionId ?? x.id, x.createdAt]))
  const now = s.now()
  const ops = []

  for (const q of model.questions) {
    const { ml: _ml, ...data } = q
    ops.push({ op: 'set', col: C.questions, id: q.questionId, data: clean({ ...data, createdAt: created[q.questionId] ?? now, updatedAt: now, source: 'import' }) })
  }
  for (const d of model.demographics) {
    ops.push({ op: 'set', col: C.demographics, id: d.id, data: clean({ ...d, createdAt: created[d.id] ?? now, updatedAt: now, source: 'import' }) })
  }
  let archived = 0
  if (archiveOthers) {
    const keepQ = new Set(model.questions.map(q => q.questionId)), keepD = new Set(model.demographics.map(d => d.id))
    for (const q of oldQ) if (!keepQ.has(q.questionId) && q.status !== 'archived') { ops.push({ op: 'update', col: C.questions, id: q.questionId, data: { status: 'archived', updatedAt: now } }); archived++ }
    for (const d of oldD) if (!keepD.has(d.id) && d.status !== 'archived') { ops.push({ op: 'update', col: C.demographics, id: d.id, data: { status: 'archived', updatedAt: now } }); archived++ }
  }
  for (const part of chunks(ops, 400)) await s.batch(part) // Firestore allows up to 500 writes per batch

  // Classifier settings carried in the file (CSV ml_weight / ml_concern_end columns)
  const mlRows = model.questions.filter(q => q.ml)
  if (mlRows.length) {
    const cfg = await getModelConfig()
    for (const q of mlRows) cfg.questions[q.questionId] = { ...(cfg.questions[q.questionId] ?? {}), ...q.ml }
    await saveModelConfig(cfg)
  }

  let questionnaireId = null
  if (createQuestionnaire) {
    const t = title || `Privacy survey (imported ${new Date().toLocaleDateString()})`
    questionnaireId = await createDraft({ title: t, description: 'Created by the survey import.' })
    await saveDraft(questionnaireId, { title: t, description: 'Created by the survey import.', questions: model.questions })
  }
  await audit('survey.import', 'survey_questions', { questions: model.questions.length, demographics: model.demographics.length, archived, questionnaireId })
  return { questions: model.questions.length, demographics: model.demographics.length, archived, questionnaireId, mlUpdated: mlRows.length }
}
