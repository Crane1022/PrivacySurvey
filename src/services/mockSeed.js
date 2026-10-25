// MOCK MODE ONLY: demonstration content so the whole admin -> publish -> respondent flow is testable offline.
import { C } from './core'
import { mockSurveyConfig } from '../mock/surveyMock'
import { snapshotQuestion } from '../utils/questions'

export async function seedMock(s) {
  if ((await s.list(C.questionnaires)).length) return
  const now = s.now()
  const qs = mockSurveyConfig.questions.map(q => ({ ...q, type: 'single' }))
  for (const q of qs) await s.set(C.questions, q.questionId, { ...q, status: 'published', createdAt: now, updatedAt: now })
  const demos = mockSurveyConfig.demographics.map((d, i) => ({ ...d, order: i + 1, status: 'published', createdAt: now, updatedAt: now }))
  for (const d of demos) await s.set(C.demographics, d.id, d)
  await s.set(C.questionnaires, 'qn_demo_v1', {
    questionnaireId: 'qn_demo_v1', title: 'Demonstration questionnaire (sample data)', description: 'Seeded for mock mode only.',
    version: 1, status: 'published', demographics: mockSurveyConfig.demographics,
    questions: qs.map((q, i) => snapshotQuestion(q, i + 1)), createdAt: now, updatedAt: now, publishedAt: now,
  })
  await s.set(C.users, 'demo-researcher', { uid: 'demo-researcher', email: 'researcher@example.test (demo)', role: 'researcher', createdAt: now })
}
