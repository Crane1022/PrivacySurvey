import { config } from '../config'
import { apiRequest } from './api'
import { getStore } from './dataStore'
import { getPublishedSurveyConfig } from './questionnaireService'
import { saveMockResponse, toAnswerList } from './responseService'
import { markAssessmentCompleted } from './userService'
import { useAuthStore } from '../stores/auth'

const delay = ms => new Promise(r => setTimeout(r, ms))

// The respondent survey is built ONLY from the questionnaire an admin published.
export async function getSurveyConfig() {
  return getPublishedSurveyConfig()
}

// Saves the signed-in respondent's answers, then asks the backend to classify them.
// Live: survey_responses/{clientSubmissionId} is create-only under the security rules, so a repeated click or retry can never
// create a second copy or change a saved one. Returns { responseId, resultStatus }.
export async function submitSurvey(payload) {
  const auth = useAuthStore()
  if (!auth.user) throw new Error('Please sign in to submit your assessment.')
  if (auth.isStaff) throw new Error('Staff accounts can preview the assessment but not submit it.')

  if (config.isMock) {
    await delay(700)
    await saveMockResponse(payload, auth.user)
    await markAssessmentCompleted(auth.user.uid).catch(() => {})
    return { responseId: payload.clientSubmissionId, resultStatus: 'demo' }
  }

  const s = await getStore()
  const responseId = payload.clientSubmissionId
  await s.set('survey_responses', responseId, {
    responseId, respondentId: auth.user.uid, questionnaireId: payload.questionnaireId, questionnaireVersion: payload.questionnaireVersion,
    consentGiven: true, consentVersion: payload.consentVersion, demographics: payload.demographics, answers: toAnswerList(payload.answers),
    status: 'submitted', submittedAt: s.now(),
  }) // success is reported only after this write succeeds
  await markAssessmentCompleted(auth.user.uid).catch(() => {})

  let resultStatus = 'requested'
  try {
    // The backend re-validates the answers against the published version, runs the approved model, and writes privacy_results.
    await apiRequest('/api/survey/classify', { method: 'POST', body: { responseId }, token: await auth.getToken() })
  } catch {
    resultStatus = 'pending' // saved, but no classification yet. The result page offers to retry; nothing is invented.
  }
  return { responseId, resultStatus }
}
