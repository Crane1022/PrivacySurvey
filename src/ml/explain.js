// XAI: turns a model's raw output into a plain-language explanation that the
// <ExplanationPanel> component can draw. Any future model (e.g. a FastAPI model using SHAP)
// only needs to return the same shape and the result page will show it unchanged:
//
// {
//   method:   'weighted-contribution' | 'rule' | 'shap' | ...,
//   summary:  'One or two sentences for the respondent',
//   score:    0..1 (optional),
//   thresholds: { fundamentalist, unconcerned } (optional),
//   factors:  [{ questionId, label, section, answer, contribution }]  // + pushes towards Fundamentalist, − towards Unconcerned
//   sections: [{ section, score }]                                     // optional
// }
const short = s => (s.length > 70 ? s.slice(0, 67).trimEnd() + '…' : s)

export function buildExplanation(modelId, out, { topN = 8 } = {}) {
  const sorted = [...out.factors].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
  const up = sorted.filter(f => f.contribution > 0).slice(0, 2)
  const down = sorted.filter(f => f.contribution < 0).slice(0, 2)

  let summary
  if (modelId === 'westin-core') {
    const r = out.rule
    summary = `You gave a privacy-protective answer on ${r.protective} of ${r.total} core Westin statements` +
      (r.unprotective ? ` and an unprotective answer on ${r.unprotective}` : '') + `, which places you as a ${out.classification}.`
  } else {
    const t = out.thresholds
    summary = `Your overall privacy-concern score is ${Math.round(out.score * 100)} out of 100 ` +
      `(Fundamentalist from ${Math.round(t.fundamentalist * 100)}, Unconcerned up to ${Math.round(t.unconcerned * 100)}).`
    if (up.length) summary += ` Answers that raised it most: "${short(up[0].label)}" (${up[0].answer}).`
    if (down.length) summary += ` Answers that lowered it most: "${short(down[0].label)}" (${down[0].answer}).`
  }

  return {
    method: modelId === 'westin-core' ? 'rule' : 'weighted-contribution',
    summary,
    score: out.score,
    thresholds: out.thresholds ?? null,
    factors: sorted.slice(0, topN),
    sections: out.sections ?? [],
    usedQuestions: out.usedQuestions,
  }
}
