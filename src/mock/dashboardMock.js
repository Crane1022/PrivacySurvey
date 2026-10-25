// DEMONSTRATION DATA ONLY. Replace with real aggregates from the backend (Live Mode).
const cats = ['Privacy Fundamentalist', 'Privacy Pragmatist', 'Privacy Unconcerned']
export const mockDashboard = {
  overview: {
    totalCompleted: 120, totalValid: 114,
    distribution: [{ category: cats[0], count: 31 }, { category: cats[1], count: 62 }, { category: cats[2], count: 21 }],
  },
  demographics: {
    groups: [
      { name: 'Age group', rows: [
        { label: '18-24', [cats[0]]: 9, [cats[1]]: 22, [cats[2]]: 9 },
        { label: '25-34', [cats[0]]: 12, [cats[1]]: 24, [cats[2]]: 7 },
        { label: '35-44', [cats[0]]: 6, [cats[1]]: 11, [cats[2]]: 3 },
        { label: '45+', [cats[0]]: 4, [cats[1]]: 5, [cats[2]]: 2 },
      ] },
    ],
  },
  surveyAnalysis: {
    questions: [
      { questionId: 'demo-q1', text: 'Permissions requested by a new app', options: [
        { label: 'Decline all optional permissions', count: 28 }, { label: 'Allow only what is needed', count: 51 },
        { label: 'Skim terms, then allow', count: 24 }, { label: 'Allow everything', count: 11 } ] },
    ],
  },
  modelMetrics: {
    modelVersion: 'demo-model-0 (not a real model)', algorithm: 'Decision Tree (demonstration values)',
    metrics: { accuracy: 0.81, precision: 0.79, recall: 0.78, f1: 0.78 },
    confusionMatrix: { labels: ['Fund.', 'Prag.', 'Unconc.'], matrix: [[24, 5, 1], [6, 52, 4], [1, 5, 16]] },
    featureImportance: [{ feature: 'demo-q1', importance: 0.34 }, { feature: 'demo-q3', importance: 0.27 }, { feature: 'ageGroup', importance: 0.12 }],
    evaluatedAt: null,
  },
  clusters: {
    k: 3,
    clusters: [
      { id: 0, size: 38, interpretation: 'Demonstration text: clusters are not assumed to equal WPSI categories.' },
      { id: 1, size: 52, interpretation: 'Demonstration text.' }, { id: 2, size: 24, interpretation: 'Demonstration text.' },
    ],
    points: null,
  },
}
export const WPSI_COLORS = { 'Privacy Fundamentalist': '#6B5BB5', 'Privacy Pragmatist': '#0F766E', 'Privacy Unconcerned': '#3B6FB6' }
