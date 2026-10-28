// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT SETTINGS FOR THE TEST CLASSIFIER  (edit here, or live in Staff → ML Model & Test Lab)
//
// This is a simple, transparent stand-in until the trained ML model is ready.
// The admin page saves a copy to Firestore (system_settings/ml_model); this file
// is only the starting point / "reset to defaults".
//
// For every question you set:
//   weight     how much the question counts (0 = ignored by the model)
//   concernEnd which end of the answer list means "MOST privacy-concerned"
//              'first' = the first option is the most concerned answer
//              'last'  = the last option is the most concerned answer
//   note       optional reminder for yourself
//
// Each answer becomes a "concern value" between 0 (not concerned) and 1 (very concerned)
// depending on its position in the list. Example with 5 options and concernEnd 'first':
//   option 1 → 1.00, option 2 → 0.75, option 3 → 0.50, option 4 → 0.25, option 5 → 0.00
// ─────────────────────────────────────────────────────────────────────────────

const scenario = {}
// 9 scenarios with 4, 5, 3, 4, 2, 3, 3, 3, 3 outcomes. Answer = how LIKELY to share (1..5),
// so the first option ("1 – Not at all likely") is the most privacy-concerned answer.
;[4, 5, 3, 4, 2, 3, 3, 3, 3].forEach((n, i) => {
  for (let o = 1; o <= n; o++) scenario[`sc${i + 1}_o${o}`] = { weight: 0.5, concernEnd: 'first' }
})

export const DEFAULT_MODEL_CONFIG = {
  activeModel: 'weighted-score', // 'weighted-score' or 'westin-core' (see src/ml/models)
  version: 1, // goes up by 1 every time the settings are saved
  thresholds: {
    fundamentalist: 0.6, // score >= this  → Privacy Fundamentalist
    unconcerned: 0.4, // score <= this  → Privacy Unconcerned (everything between → Pragmatist)
  },
  questions: {
    // ── Baseline questions ──
    baseline_q1: { weight: 2, concernEnd: 'first', note: 'Very concerned = first option' },
    baseline_q2: { weight: 2, concernEnd: 'last', note: '"Technology out of control": agreeing = more concerned' },
    baseline_q3: { weight: 1, concernEnd: 'last', note: 'Voting has no effect: general distrust proxy' },
    baseline_q4: { weight: 2, concernEnd: 'first', note: '"Business helps more than harms": disagreeing = more concerned' },
    // ── Scenario outcomes ──
    ...scenario,
    // ── Behaviour and preference ──
    ubp_q1: { weight: 2, concernEnd: 'first', note: 'PDPA protects adequately: disagreeing = more concerned' },
    ubp_q2: { weight: 1.5, concernEnd: 'first', note: 'Uses anti-tracker / VPN: Yes = concerned' },
    ubp_q3: { weight: 1.5, concernEnd: 'first', note: 'Follows cybercrime news: Yes = concerned' },
    ubp_q4: { weight: 1.5, concernEnd: 'first', note: 'Reads privacy policies: Yes = concerned' },
    ubp_q5: { weight: 1.5, concernEnd: 'last', note: 'Uses free public Wi-Fi: No = concerned' },
    ubp_q6: { weight: 1, concernEnd: 'first', note: 'Shares location/routine publicly' },
    ubp_q7: { weight: 1, concernEnd: 'first', note: 'Supports face-recognition surveillance' },
    ubp_q8: { weight: 1, concernEnd: 'first', note: 'Discloses medical records for benefits' },
    ubp_q9: { weight: 1, concernEnd: 'first', note: 'Unified health database' },
    ubp_q10: { weight: 1, concernEnd: 'first', note: 'Financial data to an investment app' },
    ubp_q11: { weight: 1, concernEnd: 'first', note: 'Fitness app may publish data' },
    ubp_q12: { weight: 1, concernEnd: 'first', note: 'Gives employer social-media access' },
    ubp_q13: { weight: 1, concernEnd: 'last', note: 'Changes passwords monthly: likely = concerned' },
    ubp_q14: { weight: 0, concernEnd: 'first', note: 'Direction unclear (security habit, not privacy). Ignored until you decide.' },
  },
  // Classic Westin index: the three "core" statements (lost control / businesses / laws).
  westinCoreItems: ['baseline_q2', 'baseline_q4', 'ubp_q1'],
}
