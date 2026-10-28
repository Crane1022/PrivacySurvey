// Test fixture: imports the real survey document (tests/fixtures/Privacy_Survey_Questions.docx) through the
// same importer the admin page uses, then publishes it. There is no built-in sample data any more.
import fs from 'fs'
export async function importSurveyDocx() {
  const { readDocx, parseSurveyParagraphs } = await import('./src/import/parseDocx.js')
  const { finalizeModel } = await import('./src/import/model.js')
  const raw = parseSurveyParagraphs(await readDocx(fs.readFileSync('./fixtures/Privacy_Survey_Questions.docx')))
  return finalizeModel(raw, ['single', 'multiple', 'likert', 'dropdown'])
}
export async function seedPublishedSurvey() {
  const { applyImport } = await import('./src/import/importService.js')
  const A = await import('./src/services/adminService.js')
  const model = await importSurveyDocx()
  const r = await applyImport(model, { createQuestionnaire: true, title: 'Imported survey' })
  await A.publishQuestionnaire(r.questionnaireId)
  return { model, ...r }
}
