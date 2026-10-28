// Turns answers into numbers the models can use.

export const CATEGORIES = { F: 'Privacy Fundamentalist', P: 'Privacy Pragmatist', U: 'Privacy Unconcerned' }

// Position of the chosen option → concern value between 0 (not concerned) and 1 (very concerned).
export function concernValue(question, answerValue, concernEnd = 'first') {
  const opts = question?.options ?? []
  const i = opts.findIndex(o => o.value === answerValue)
  if (i < 0 || opts.length < 2) return null
  const fromStart = i / (opts.length - 1) // 0 for the first option, 1 for the last
  return concernEnd === 'last' ? fromStart : 1 - fromStart
}

// The response stores answers as [{ questionId, selectedOptionId }]; the models use { questionId: value }.
export function answersToMap(answers) {
  if (!Array.isArray(answers)) return { ...(answers ?? {}) }
  return Object.fromEntries(answers.map(a => [a.questionId, a.selectedOptionId ?? a.selectedOptionIds]))
}

export const optionLabel = (q, v) => q?.options?.find(o => o.value === v)?.label ?? '—'
export const round = (n, d = 3) => Math.round(n * 10 ** d) / 10 ** d
