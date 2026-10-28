// The "import model": what every file format (.docx, .csv, .json) is converted into before preview and saving.
//
// {
//   demographics: [{ id, label, required, type?: 'radio'|'select', options: [{ label, other? }] }],
//   questions:    [{ questionId, section, scenario, questionText, type, options: [label, ...], isRequired, ml?: { weight, concernEnd } }],
//   warnings:     [{ level: 'error'|'warning'|'info', ref, text }]
// }
import { validateQuestion, validateDemographic } from '../utils/questions'

export const emptyModel = () => ({ demographics: [], questions: [], warnings: [] })

// Gives every item final ids, option values, types and order, and lists anything that needs attention.
export function finalizeModel(m, enabledTypes) {
  const warnings = (m.warnings ?? []).filter(w => w.level !== 'check') // drop old checks when re-validating after edits
  const demographics = m.demographics.map((d, i) => {
    const id = d.id || `dm_${i + 1}`
    const options = d.options.map((o, j) => ({ value: `${id}-o${j + 1}`, label: (o.label ?? o).toString().trim(), ...(o.other ? { other: true } : {}) }))
    return { id, label: d.label.trim(), type: d.type || (options.length > 6 ? 'select' : 'radio'), required: d.required !== false, order: i + 1, status: 'published', options }
  })
  const questions = m.questions.map((q, i) => {
    const questionId = q.questionId || `q_${i + 1}`
    const options = q.options.map((o, j) => ({ value: `${questionId}-o${j + 1}`, label: (o.label ?? o).toString().trim() }))
    return {
      questionId, section: q.section ?? '', scenario: q.scenario ?? '', questionText: q.questionText.trim(),
      type: q.type || 'single', options, isRequired: q.isRequired !== false, order: i + 1, status: 'published',
      ...(q.ml ? { ml: q.ml } : {}),
    }
  })

  const check = (ref, text, level = 'check') => warnings.push({ level, ref, text })
  const seen = new Set()
  for (const d of demographics) {
    for (const e of validateDemographic(d)) check(d.id, `${d.label}: ${e}`, 'error')
    if (seen.has(d.id)) check(d.id, `Duplicate id ${d.id}.`, 'error')
    seen.add(d.id)
  }
  // Word lists sometimes lose a line break and join two options ("Labuan Melacca"). Point out two-word
  // options in long lists of mostly one-word options so they can be checked in the preview.
  for (const d of demographics) {
    const twoWord = d.options.filter(o => !o.other && /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(o.label))
    const oneWord = d.options.filter(o => /^\S+$/.test(o.label)).length
    if (d.options.length >= 8 && oneWord >= d.options.length / 2 && twoWord.length) {
      check(d.id, `${d.label}: check that these are not two options joined together: ${twoWord.map(o => `"${o.label}"`).join(', ')}.`, 'warning')
    }
  }
  for (const q of questions) {
    for (const e of validateQuestion(q, enabledTypes)) check(q.questionId, `${q.questionId}: ${e}`, 'error')
    if (seen.has(q.questionId)) check(q.questionId, `Duplicate id ${q.questionId}.`, 'error')
    seen.add(q.questionId)
  }
  return { demographics, questions, warnings }
}

export const hasErrors = m => m.warnings.some(w => w.level === 'error')
