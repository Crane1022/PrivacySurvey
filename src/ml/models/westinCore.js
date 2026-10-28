// MODEL 2: Classic Westin rule (three core statements).
//
// Westin's original index asks three statements (consumers have lost control / businesses handle data
// properly / laws protect us). Your survey's closest items are listed in config.westinCoreItems.
//   privacy-protective answer on ALL items → Privacy Fundamentalist
//   unprotective answer on ALL items       → Privacy Unconcerned
//   anything else                          → Privacy Pragmatist
// A neutral answer (exactly in the middle) counts as neither, so it leads to Pragmatist.
import { CATEGORIES, concernValue, optionLabel, round } from '../features'

export default {
  id: 'westin-core',
  name: 'Westin core-statement rule',
  description: 'The original Westin rule: protective on every core statement = Fundamentalist, unprotective on every one = Unconcerned, otherwise Pragmatist.',

  predict({ questions, answers, config }) {
    const byId = Object.fromEntries(questions.map(q => [q.questionId, q]))
    const items = (config.westinCoreItems ?? []).filter(id => byId[id])
    if (!items.length) throw new Error('None of the Westin core questions are in this questionnaire. Set them in the ML Model page.')

    const factors = items.map(id => {
      const q = byId[id]
      const c = concernValue(q, answers[id], config.questions?.[id]?.concernEnd)
      if (c === null) throw new Error(`Core question "${q.questionText}" was not answered.`)
      return {
        questionId: id, label: q.questionText, section: q.section || 'Other', answer: optionLabel(q, answers[id]),
        concern: round(c, 2), weight: 1, contribution: round((c - 0.5) / items.length, 4),
        stance: c > 0.5 ? 'protective' : c < 0.5 ? 'unprotective' : 'neutral',
      }
    })
    const pro = factors.filter(f => f.stance === 'protective').length
    const anti = factors.filter(f => f.stance === 'unprotective').length
    const classification = pro === items.length ? CATEGORIES.F : anti === items.length ? CATEGORIES.U : CATEGORIES.P
    const score = factors.reduce((s, f) => s + f.concern, 0) / factors.length
    return { classification, score: round(score, 3), factors, sections: [], usedQuestions: items.length, rule: { protective: pro, unprotective: anti, total: items.length } }
  },
}
