export const QUESTION_TYPES = {
  single: { label: 'Single choice', multi: false, min: 2 },
  multiple: { label: 'Multiple choice', multi: true, min: 2 },
  likert: { label: 'Likert scale', multi: false, min: 2 },
  dropdown: { label: 'Dropdown', multi: false, min: 2 },
}
export const DEFAULT_ENABLED_TYPES = ['single', 'multiple', 'likert', 'dropdown']
export const LIKERT_DEFAULT = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']

export const newQuestionId = () => 'q_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

// Option values are stable identifiers (they feed the ML schema); labels can be edited freely.
export function nextOptionValue(questionId, options) {
  const used = options.map(o => Number(String(o.value).split('-o').pop())).filter(Number.isFinite)
  return `${questionId}-o${(used.length ? Math.max(...used) : 0) + 1}`
}

export function blankQuestion(order = 1) {
  const questionId = newQuestionId()
  return {
    questionId, section: '', scenario: '', questionText: '', type: 'single',
    options: [1, 2].map(n => ({ value: `${questionId}-o${n}`, label: '' })),
    isRequired: true, order, status: 'draft',
  }
}

export function likertOptions(questionId) {
  return LIKERT_DEFAULT.map((label, i) => ({ value: `${questionId}-o${i + 1}`, label }))
}

export function validateQuestion(q, enabledTypes = DEFAULT_ENABLED_TYPES) {
  const errs = []
  if (!q.questionText?.trim()) errs.push('Question title is required.')
  if (!enabledTypes.includes(q.type) && !QUESTION_TYPES[q.type]) errs.push('Unknown question type.')
  else if (!enabledTypes.includes(q.type)) errs.push(`The question type "${QUESTION_TYPES[q.type].label}" is currently disabled in System Settings.`)
  const opts = q.options ?? []
  if (opts.length < (QUESTION_TYPES[q.type]?.min ?? 2)) errs.push('At least 2 answer options are required.')
  if (opts.some(o => !o.label?.trim())) errs.push('Every answer option needs text.')
  const labels = opts.map(o => o.label?.trim().toLowerCase())
  if (new Set(labels).size !== labels.length) errs.push('Answer options must be unique.')
  if (!Number.isFinite(Number(q.order)) || Number(q.order) < 1) errs.push('Display order must be 1 or higher.')
  return errs
}

export const snapshotQuestion = (q, order) => ({
  questionId: q.questionId,
  section: q.section ?? '',
  scenario: q.scenario ?? '',
  questionText: q.questionText,
  type: q.type,
  options: q.options.map(o => ({ value: o.value, label: o.label })),
  isRequired: !!q.isRequired,
  order,
})

export function isAnswered(q, a) {
  if (q?.type === 'multiple') return Array.isArray(a) && a.length > 0
  return a !== undefined && a !== null && a !== ''
}

// ML feature schema: what the trained model expects. Locked schemas block incompatible publishes.
export function schemaFromQuestions(questions) {
  const features = {}
  for (const q of questions) features[q.questionId] = { type: q.type, optionValues: q.options.map(o => o.value).sort() }
  return features
}

export function checkMlCompatibility(questions, schema) {
  if (!schema?.locked) return { ok: true, problems: [] }
  const problems = []
  const now = schemaFromQuestions(questions)
  for (const id of Object.keys(schema.features ?? {})) {
    if (!now[id]) problems.push(`Question ${id} is part of the locked ML schema but is missing from this questionnaire.`)
    else {
      const a = schema.features[id], b = now[id]
      if (a.type !== b.type) problems.push(`Question ${id}: type changed (${a.type} → ${b.type}).`)
      if (JSON.stringify(a.optionValues) !== JSON.stringify(b.optionValues)) problems.push(`Question ${id}: answer options differ from the locked ML schema.`)
    }
  }
  for (const id of Object.keys(now)) if (!schema.features?.[id]) problems.push(`Question ${id} is not part of the locked ML schema.`)
  return { ok: problems.length === 0, problems }
}

// ---- demographic fields (respondent shape: id, label, type 'radio' | 'select', required, options) ----
export const DEMOGRAPHIC_TYPES = { radio: 'Radio buttons', select: 'Dropdown' }

export function blankDemographic(order, id) {
  return { id, label: '', type: 'radio', required: true, order, status: 'draft', options: [1, 2].map(n => ({ value: `${id}-o${n}`, label: '' })) }
}
export function validateDemographic(d) {
  const errs = []
  if (!d.label?.trim()) errs.push('Field label is required.')
  if (!DEMOGRAPHIC_TYPES[d.type]) errs.push('Unknown field type.')
  const opts = d.options ?? []
  if (opts.length < 2) errs.push('At least 2 options are required.')
  if (opts.some(o => !o.label?.trim())) errs.push('Every option needs text.')
  const labels = opts.map(o => o.label?.trim().toLowerCase())
  if (new Set(labels).size !== labels.length) errs.push('Options must be unique.')
  if (!Number.isFinite(Number(d.order)) || Number(d.order) < 1) errs.push('Display order must be 1 or higher.')
  return errs
}
