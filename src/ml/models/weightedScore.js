// MODEL 1: Weighted privacy-concern score (transparent baseline for testing).
//
//   score = Σ (weight × concern) / Σ weight          (between 0 and 1)
//   score ≥ thresholds.fundamentalist → Privacy Fundamentalist
//   score ≤ thresholds.unconcerned    → Privacy Unconcerned
//   otherwise                         → Privacy Pragmatist
//
// Explanation (XAI): because the model is a weighted average, each answer's share of the
// score is exact:  contribution = weight × (concern − 0.5) / Σ weight
// Positive contributions push towards "Fundamentalist", negative ones towards "Unconcerned".
// All contributions added together equal (score − 0.5).
import { CATEGORIES, concernValue, optionLabel, round } from '../features'

export default {
  id: 'weighted-score',
  name: 'Weighted concern score',
  description: 'Averages a privacy-concern value for every answer, using the weights you set, then compares the score with two thresholds.',

  predict({ questions, answers, config }) {
    const rows = []
    for (const q of questions) {
      const setting = config.questions?.[q.questionId]
      const weight = Number(setting?.weight ?? 0)
      if (!weight) continue
      const c = concernValue(q, answers[q.questionId], setting.concernEnd)
      if (c === null) continue // unanswered or not a single-choice answer
      rows.push({ q, weight, concern: c })
    }
    const totalWeight = rows.reduce((s, r) => s + r.weight, 0)
    if (!totalWeight) throw new Error('No answered question has a weight above 0, so the model cannot score this response.')

    const score = rows.reduce((s, r) => s + r.weight * r.concern, 0) / totalWeight
    const t = config.thresholds
    const classification = score >= t.fundamentalist ? CATEGORIES.F : score <= t.unconcerned ? CATEGORIES.U : CATEGORIES.P

    // ---- explanation ----
    const factors = rows.map(r => ({
      questionId: r.q.questionId,
      label: r.q.questionText,
      section: r.q.section || 'Other',
      answer: optionLabel(r.q, answers[r.q.questionId]),
      concern: round(r.concern, 2),
      weight: r.weight,
      contribution: round((r.weight * (r.concern - 0.5)) / totalWeight, 4),
    }))
    const bySection = {}
    for (const r of rows) {
      const k = r.q.section || 'Other'
      bySection[k] ??= { w: 0, s: 0 }
      bySection[k].w += r.weight
      bySection[k].s += r.weight * r.concern
    }
    const sections = Object.entries(bySection).map(([section, v]) => ({ section, score: round(v.s / v.w, 3) }))
    return { classification, score: round(score, 3), factors, sections, usedQuestions: rows.length, thresholds: { ...t } }
  },
}
