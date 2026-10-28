// Classifier + explanation + import format tests (pure functions, no database).
const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1 } else console.log('ok  ', m) }
const { classify, DEFAULT_MODEL_CONFIG, MODELS } = await import('./src/ml/index.js')
const { concernValue } = await import('./src/ml/features.js')
const { importSurveyDocx } = await import('./fixture.mjs')
const { modelToCsv, csvToModel } = await import('./src/import/csv.js')
const { finalizeModel } = await import('./src/import/model.js')

const model = await importSurveyDocx()
const qs = model.questions
ok(qs.length === 48 && model.demographics.length === 4, 'docx parsed: 48 questions, 4 demographic fields')
ok(model.warnings.some(w => /Labuan Melacca/.test(w.text)) && model.warnings.some(w => /Selangor Terengganu/.test(w.text)), 'preview warns about joined options (Labuan Melacca, Selangor Terengganu)')
ok(qs.every(q => DEFAULT_MODEL_CONFIG.questions[q.questionId]), 'every imported question id has default classifier settings')

const q5 = { options: [1, 2, 3, 4, 5].map(n => ({ value: 'v' + n })) }
ok(concernValue(q5, 'v1', 'first') === 1 && concernValue(q5, 'v5', 'first') === 0 && concernValue(q5, 'v3', 'last') === 0.5, 'concern value from option position')

const pick = which => Object.fromEntries(qs.map(q => {
  const end = DEFAULT_MODEL_CONFIG.questions[q.questionId].concernEnd, n = q.options.length
  const i = which === 'mid' ? Math.floor((n - 1) / 2) : (which === 'concerned') === (end === 'first') ? 0 : n - 1
  return [q.questionId, q.options[i].value]
}))
const hi = classify({ questions: qs, answers: pick('concerned') })
const lo = classify({ questions: qs, answers: pick('unconcerned') })
const mid = classify({ questions: qs, answers: pick('mid') })
ok(hi.classification === 'Privacy Fundamentalist' && hi.score === 1, 'all most-concerned answers → Fundamentalist (score 1)')
ok(lo.classification === 'Privacy Unconcerned' && lo.score === 0, 'all least-concerned answers → Unconcerned (score 0)')
ok(mid.classification === 'Privacy Pragmatist', 'middle answers → Pragmatist')

// XAI: contributions add up exactly to (score − 0.5)
const full = MODELS['weighted-score'].predict({ questions: qs, answers: pick('concerned'), config: DEFAULT_MODEL_CONFIG })
const sum = full.factors.reduce((s, f) => s + f.contribution, 0)
ok(Math.abs(sum - (full.score - 0.5)) < 0.01, 'explanation contributions sum to score − 0.5')
ok(hi.explanation.factors.length <= 8 && hi.explanation.factors.every(f => f.contribution > 0), 'top factors all push towards Fundamentalist for a concerned respondent')
ok(full.factors.every(f => f.questionId !== 'ubp_q14'), 'weight-0 question is ignored')

// thresholds are configurable
const strict = { ...DEFAULT_MODEL_CONFIG, thresholds: { fundamentalist: 0.95, unconcerned: 0.05 } }
const a = pick('mid'); a.baseline_q1 = qs[0].options[0].value
ok(classify({ questions: qs, answers: a, config: strict }).classification === 'Privacy Pragmatist', 'thresholds come from the settings')

// Westin core rule
const w = { ...DEFAULT_MODEL_CONFIG, activeModel: 'westin-core' }
ok(classify({ questions: qs, answers: pick('concerned'), config: w }).classification === 'Privacy Fundamentalist', 'Westin rule: protective on all core items → Fundamentalist')
const mixed = pick('concerned'); mixed.ubp_q1 = qs.find(q => q.questionId === 'ubp_q1').options[4].value
const wm = classify({ questions: qs, answers: mixed, config: w })
ok(wm.classification === 'Privacy Pragmatist' && wm.explanation.method === 'rule', 'Westin rule: mixed core answers → Pragmatist, rule explanation')

// CSV round trip (edit in Excel, import again)
const csv = modelToCsv(model, DEFAULT_MODEL_CONFIG.questions)
const back = finalizeModel(csvToModel(csv), ['single', 'multiple', 'likert', 'dropdown'])
ok(back.questions.length === 48 && back.demographics.length === 4, 'CSV export → import keeps all items')
ok(JSON.stringify(back.questions.map(q => [q.questionId, q.options.map(o => o.label)])) === JSON.stringify(qs.map(q => [q.questionId, q.options.map(o => o.label)])), 'CSV round trip keeps ids and options')
ok(back.questions[0].ml?.weight === 2 && back.demographics[2].options.some(o => o.other), 'CSV carries classifier weights and "Other [text]"')
try { finalizeModel(csvToModel('kind,text\nquestion,x'), []); ok(false, 'bad csv') } catch { ok(true, 'CSV without options column is rejected') }
