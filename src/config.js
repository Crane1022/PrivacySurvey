const mode = import.meta.env.VITE_DATA_MODE === 'live' ? 'live' : 'mock'

export const config = {
  dataMode: mode,
  isMock: mode === 'mock',
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, ''),
}
