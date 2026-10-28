// ─────────────────────────────────────────────────────────────────────────────
// CLASSIFIER "PLUG" — the one place the rest of the app talks to a model.
//
// To add a model: create src/ml/models/yourModel.js exporting
//   { id, name, description, predict({ questions, answers, config }) → { classification, score, factors, ... } }
// and add it to MODELS below. It then appears in Staff → ML Model & Test Lab.
//
// When the real trained model is ready on the FastAPI backend, set VITE_CLASSIFIER_MODE=api in .env:
// the app will then ask the backend instead (see services/classificationService.js).
// ─────────────────────────────────────────────────────────────────────────────
import weightedScore from './models/weightedScore'
import westinCore from './models/westinCore'
import { buildExplanation } from './explain'
import { answersToMap } from './features'
import { DEFAULT_MODEL_CONFIG } from './defaultModelConfig'

export const MODELS = { [weightedScore.id]: weightedScore, [westinCore.id]: westinCore }
export { DEFAULT_MODEL_CONFIG }

// Pure function: no database, no network. Used by the result flow AND the test lab.
export function classify({ questions, answers, config = DEFAULT_MODEL_CONFIG }) {
  const model = MODELS[config.activeModel] ?? weightedScore
  const out = model.predict({ questions, answers: answersToMap(answers), config })
  return {
    classification: out.classification,
    score: out.score,
    modelId: model.id,
    modelVersion: `${model.id} v${config.version ?? 1}`,
    explanation: buildExplanation(model.id, out),
  }
}

// Merges saved settings over the defaults so newly added default fields always exist.
export function withDefaults(saved) {
  const s = saved ?? {}
  return {
    ...DEFAULT_MODEL_CONFIG,
    ...s,
    thresholds: { ...DEFAULT_MODEL_CONFIG.thresholds, ...(s.thresholds ?? {}) },
    questions: { ...DEFAULT_MODEL_CONFIG.questions, ...(s.questions ?? {}) },
    westinCoreItems: s.westinCoreItems ?? DEFAULT_MODEL_CONFIG.westinCoreItems,
  }
}
