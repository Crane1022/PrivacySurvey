// CSV import/export — easy to edit in Excel or Google Sheets.
//
// Columns (header row required, order does not matter):
//   kind          "demographic" or "question"
//   id            optional stable id, e.g. baseline_q1 (keep it the same when you edit, so the ML settings still match)
//   section       e.g. "Baseline Questions"
//   scenario      scenario text shown above the question (optional)
//   text          the question / field label
//   type          question: single | likert | multiple | dropdown      demographic: radio | select
//   options       answer options separated by " | "   (write "Other [text]" for an "Other" with a text box)
//   required      yes / no (default yes)
//   ml_weight     optional: weight for the test classifier (0 = ignore)
//   ml_concern_end optional: first / last  (which option is the most privacy-concerned answer)
import { emptyModel } from './model'

export function parseCsvText(text) {
  const rows = []
  let row = [], cell = '', q = false
  const s = text.replace(/^﻿/, '')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (q) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter(r => r.some(v => v.trim()))
}

export function csvToModel(text) {
  const rows = parseCsvText(text)
  if (rows.length < 2) throw new Error('The CSV file is empty.')
  const head = rows[0].map(h => h.trim().toLowerCase())
  const col = name => head.indexOf(name)
  for (const need of ['kind', 'text', 'options']) if (col(need) < 0) throw new Error(`The CSV needs a "${need}" column. Download the template to see the format.`)
  const get = (r, name) => (col(name) >= 0 ? (r[col(name)] ?? '').trim() : '')
  const m = emptyModel()
  rows.slice(1).forEach((r, i) => {
    const kind = get(r, 'kind').toLowerCase()
    const opts = get(r, 'options').split('|').map(o => o.trim()).filter(Boolean)
    const required = !/^(no|false|0)$/i.test(get(r, 'required'))
    if (kind.startsWith('demo')) {
      m.demographics.push({
        id: get(r, 'id'), label: get(r, 'text'), type: get(r, 'type') || undefined, required,
        options: opts.map(o => (/\[text\]$/i.test(o) ? { label: o.replace(/\s*\[text\]$/i, ''), other: true } : { label: o })),
      })
    } else if (kind.startsWith('q')) {
      const w = get(r, 'ml_weight'), end = get(r, 'ml_concern_end').toLowerCase()
      m.questions.push({
        questionId: get(r, 'id'), section: get(r, 'section'), scenario: get(r, 'scenario'), questionText: get(r, 'text'),
        type: get(r, 'type') || 'single', options: opts, isRequired: required,
        ...(w !== '' ? { ml: { weight: Number(w) || 0, concernEnd: end === 'last' ? 'last' : 'first' } } : {}),
      })
    } else if (kind) {
      m.warnings.push({ level: 'warning', ref: `row ${i + 2}`, text: `Row ${i + 2}: unknown kind "${kind}" was skipped.` })
    }
  })
  return m
}

const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
// Exports demographics + questions (+ the classifier settings, if given) in the same CSV format.
export function modelToCsv({ demographics, questions }, mlQuestions = {}) {
  const lines = [['kind', 'id', 'section', 'scenario', 'text', 'type', 'options', 'required', 'ml_weight', 'ml_concern_end']]
  for (const d of demographics) {
    lines.push(['demographic', d.id, 'Demographics', '', d.label, d.type ?? '', d.options.map(o => (o.other ? `${o.label} [text]` : o.label ?? o)).join(' | '), d.required === false ? 'no' : 'yes', '', ''])
  }
  for (const q of questions) {
    const ml = q.ml ?? mlQuestions[q.questionId]
    lines.push(['question', q.questionId, q.section, q.scenario, q.questionText, q.type, q.options.map(o => o.label ?? o).join(' | '),
      q.isRequired === false ? 'no' : 'yes', ml ? ml.weight : '', ml ? ml.concernEnd : ''])
  }
  return '﻿' + lines.map(l => l.map(esc).join(',')).join('\r\n')
}
