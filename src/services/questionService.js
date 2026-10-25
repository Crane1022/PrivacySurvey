import { db, audit, clean, C } from './core'
import { getSettings } from './settingsService'
import { validateQuestion } from '../utils/questions'

export async function listQuestions() {
  const s = await db()
  return (await s.list(C.questions)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}
export async function saveQuestion(q, isNew) {
  const s = await db()
  const settings = await getSettings()
  const errs = validateQuestion(q, settings.enabledQuestionTypes)
  if (errs.length) throw new Error(errs.join(' '))
  const data = clean({
    questionId: q.questionId, section: q.section ?? '', scenario: q.scenario ?? '', questionText: q.questionText.trim(),
    type: q.type, options: q.options.map(o => ({ value: o.value, label: o.label.trim() })),
    isRequired: !!q.isRequired, order: Number(q.order), status: q.status, updatedAt: s.now(),
  })
  if (isNew) await s.set(C.questions, q.questionId, { ...data, createdAt: s.now() })
  else await s.update(C.questions, q.questionId, data)
  await audit(isNew ? 'question.create' : 'question.update', `survey_questions/${q.questionId}`, { status: q.status })
}
// Questions are archived, never deleted, so historical questionnaires and responses stay reproducible.
export async function setQuestionStatus(id, status) {
  const s = await db()
  await s.update(C.questions, id, { status, updatedAt: s.now() })
  await audit('question.status', `survey_questions/${id}`, { status })
}
