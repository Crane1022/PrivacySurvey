const mode = import.meta.env.VITE_DATA_MODE === 'live' ? 'live' : 'mock'

export const config = {
  dataMode: mode,
  isMock: mode === 'mock',
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, ''),
  // 'local' = the simple test classifier in src/ml runs in the browser (for testing before the backend exists)
  // 'api'   = the FastAPI backend classifies (POST /api/survey/classify)
  classifierMode: import.meta.env.VITE_CLASSIFIER_MODE === 'api' ? 'api' : 'local',
}
