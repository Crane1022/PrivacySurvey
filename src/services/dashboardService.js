// Research analytics calculated from the REAL stored data (survey_responses + privacy_results).
// Nothing here is sample data. Individual answers are only counted, never shown.
//   • privacy_results is readable by researchers and admins.
//   • survey_responses is admin-only under the security rules, so question/demographic breakdowns need an admin account
//     (or, later, aggregate endpoints on the backend).
import { db, C } from './core'
import { CATEGORIES } from '../ml/features'
import { getModelConfig } from './classificationService'

const CATS = Object.values(CATEGORIES)
const ACCESS_NOTE = 'Question-level and demographic breakdowns need an admin account (survey responses are admin-only).'

async function loadAll() {
  const s = await db()
  const results = await s.list('privacy_results')
  let responses = null
  try { responses = await s.list(C.responses) } catch { /* researcher: no access to raw responses */ }
  let questionnaires
  try { questionnaires = await s.list(C.questionnaires) } catch {
    const pub = await s.queryOne(C.questionnaires, 'status', 'published').catch(() => null)
    questionnaires = pub ? [pub] : []
  }
  return { results, responses, questionnaires }
}

function countBy(list, key) {
  const m = {}
  for (const x of list) m[key(x)] = (m[key(x)] ?? 0) + 1
  return m
}

export async function getOverview() {
  const { results, responses } = await loadAll()
  const by = countBy(results, r => r.classification)
  return {
    totalCompleted: responses ? responses.length : results.length,
    totalValid: results.length,
    distribution: CATS.map(category => ({ category, count: by[category] ?? 0 })),
  }
}

export async function getSurveyAnalysis() {
  const { responses, questionnaires } = await loadAll()
  if (!responses) return { questions: [], note: ACCESS_NOTE }
  // Count every answer per question/option, labelled with the questionnaire version it was answered on.
  const qMeta = {}
  for (const qn of [...questionnaires].sort((a, b) => a.version - b.version)) {
    for (const q of qn.questions ?? []) qMeta[q.questionId] = q // newest version's wording wins
  }
  const counts = {}
  for (const r of responses) {
    for (const a of r.answers ?? []) {
      const vals = a.selectedOptionIds ?? [a.selectedOptionId]
      counts[a.questionId] ??= {}
      for (const v of vals) counts[a.questionId][v] = (counts[a.questionId][v] ?? 0) + 1
    }
  }
  const questions = Object.keys(counts)
    .sort((a, b) => (qMeta[a]?.order ?? 999) - (qMeta[b]?.order ?? 999))
    .map(id => {
      const q = qMeta[id]
      const opts = q?.options ?? Object.keys(counts[id]).map(v => ({ value: v, label: v }))
      return { questionId: id, text: q?.questionText ?? id, section: q?.section ?? '', options: opts.map(o => ({ label: o.label, count: counts[id][o.value] ?? 0 })) }
    })
  return { questions }
}

export async function getDemographics() {
  const { results, responses, questionnaires } = await loadAll()
  if (!responses) return { groups: [], note: ACCESS_NOTE }
  const catByResponse = Object.fromEntries(results.map(r => [r.responseId, r.classification]))
  const fields = {}
  for (const qn of [...questionnaires].sort((a, b) => a.version - b.version)) for (const f of qn.demographics ?? []) fields[f.id] = f
  const groups = Object.values(fields).map(f => {
    const rows = f.options.map(o => ({ label: o.label, ...Object.fromEntries(CATS.map(c => [c, 0])) }))
    for (const r of responses) {
      const cat = catByResponse[r.responseId]
      const i = f.options.findIndex(o => o.value === r.demographics?.[f.id])
      if (cat && i >= 0) rows[i][cat]++
    }
    return { name: f.label, rows: rows.filter(row => CATS.some(c => row[c] > 0)) }
  }).filter(g => g.rows.length)
  return { groups }
}

// The test classifier has no labelled data, so accuracy/precision cannot be calculated yet.
// What we CAN show honestly: which model/settings are active and how the stored scores are spread.
export async function getModelMetrics() {
  const s = await db()
  const [cfg, results] = await Promise.all([getModelConfig(), s.list('privacy_results')])
  const buckets = Array.from({ length: 10 }, (_, i) => ({ label: `${i * 10}–${i * 10 + 9}`, value: 0 }))
  for (const r of results) if (typeof r.score === 'number') buckets[Math.min(9, Math.floor(r.score * 10))].value++
  const byModel = countBy(results, r => r.modelVersion ?? 'unknown')
  return {
    activeModel: cfg.activeModel, version: cfg.version, thresholds: cfg.thresholds,
    weightedQuestions: Object.values(cfg.questions).filter(q => Number(q.weight) > 0).length,
    scoreBuckets: buckets, resultsByModel: Object.entries(byModel).map(([label, value]) => ({ label, value })),
    total: results.length,
  }
}

// Clustering is part of the ML pipeline that is not built yet.
export async function getClusters() {
  return null
}
