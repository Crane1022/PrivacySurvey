import { config } from '../config'
import { apiRequest } from './api'
import { useAuthStore } from '../stores/auth'
import { mockDashboard } from '../mock/dashboardMock'

const delay = ms => new Promise(r => setTimeout(r, ms))

// Researcher/admin analytics. Live: backend endpoints verify the Firebase ID token and role.
async function get(path, mockKey) {
  if (config.isMock) {
    await delay(300)
    return mockDashboard[mockKey]
  }
  const token = await useAuthStore().getToken()
  return apiRequest(path, { token })
}

export const getOverview = () => get('/api/admin/overview', 'overview')
export const getDemographics = () => get('/api/admin/demographics', 'demographics')
export const getSurveyAnalysis = () => get('/api/admin/survey-analysis', 'surveyAnalysis')
export const getModelMetrics = () => get('/api/admin/model-metrics', 'modelMetrics')
export const getClusters = () => get('/api/admin/clusters', 'clusters')
