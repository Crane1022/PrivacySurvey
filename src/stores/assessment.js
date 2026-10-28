import { defineStore } from 'pinia'
import { getSurveyConfig, submitSurvey } from '../services/surveyService'
import { isAnswered } from '../utils/questions'
import { useAuthStore } from './auth'

const KEY = 'wpsi_assessment_progress'
const PREVIEW_KEY = 'wpsi_preview_config'

const newId = () => (crypto?.randomUUID ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(16).slice(2)}`)

export const useAssessmentStore = defineStore('assessment', {
  state: () => ({
    config: null,
    configLoading: false,
    configError: null,
    consentGiven: false,
    demographics: {},
    answers: {},
    currentIndex: 0,
    submitting: false,
    submitError: null,
    isPreview: false, // admin preview: nothing is ever submitted or stored
    questionnaireKey: null, // "id:version" the saved progress belongs to
    clientSubmissionId: newId(), // lets the backend reject duplicate submissions
  }),

  getters: {
    questions: s => [...(s.config?.questions ?? [])].sort((a, b) => a.order - b.order),
    totalQuestions() { return this.questions.length },
    currentQuestion() { return this.questions[this.currentIndex] ?? null },
    unansweredRequired() { return this.questions.filter(q => q.isRequired && !isAnswered(q, this.answers[q.questionId])) },
    demographicsComplete() {
      return (this.config?.demographics ?? []).every(f => {
        const v = this.demographics[f.id]
        if (!v) return !f.required
        const chosen = f.options.find(o => o.value === v)
        return !chosen?.other || !!this.demographics[`${f.id}__other`]?.trim() // "Other" needs the text filled in
      })
    },
  },

  actions: {
    restore() {
      try {
        const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null')
        const owner = useAuthStore().user?.uid ?? null
        if (saved && saved.ownerUid === owner) Object.assign(this, saved) // never restore someone else's answers on a shared device
        else if (saved) sessionStorage.removeItem(KEY)
        if (this.isPreview && !this.config) {
          this.config = JSON.parse(sessionStorage.getItem(PREVIEW_KEY) || 'null')
        }
      } catch {
        sessionStorage.removeItem(KEY)
      }
    },
    persist() {
      const { consentGiven, demographics, answers, currentIndex, clientSubmissionId, isPreview, questionnaireKey } = this
      const ownerUid = useAuthStore().user?.uid ?? null
      sessionStorage.setItem(KEY, JSON.stringify({ consentGiven, demographics, answers, currentIndex, clientSubmissionId, isPreview, questionnaireKey, ownerUid }))
    },
    async loadConfig() {
      if (this.config || this.configLoading) return
      this.configLoading = true
      this.configError = null
      try {
        this.config = await getSurveyConfig()
        const key = `${this.config.questionnaireId}:${this.config.questionnaireVersion}`
        if (this.questionnaireKey && this.questionnaireKey !== key) this.reset() // questionnaire changed: stale answers are dropped
        this.questionnaireKey = key
        this.persist()
      } catch (e) {
        this.configError = e.message
      } finally {
        this.configLoading = false
      }
    },
    startPreview(previewConfig) {
      this.reset()
      this.isPreview = true
      this.config = previewConfig
      this.configError = null
      sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(previewConfig))
      this.persist()
    },
    exitPreview() {
      this.reset()
      this.isPreview = false
      this.config = null
      sessionStorage.removeItem(PREVIEW_KEY)
      sessionStorage.removeItem(KEY)
    },
    setConsent(v) { this.consentGiven = v; this.persist() },
    setDemographic(id, value) { this.demographics[id] = value; this.persist() },
    setAnswer(qid, value) { this.answers[qid] = value; this.persist() },
    goTo(i) { this.currentIndex = Math.max(0, Math.min(i, this.totalQuestions - 1)); this.persist() },
    async submit() {
      if (this.submitting) return null // blocks double submits
      if (this.isPreview) return 'preview' // preview submissions are discarded
      this.submitting = true
      this.submitError = null
      try {
        const res = await submitSurvey({
          questionnaireId: this.config.questionnaireId,
          questionnaireVersion: this.config.questionnaireVersion,
          consentVersion: this.config.consentVersion,
          consentGiven: this.consentGiven,
          demographics: this.demographics,
          answers: this.answers,
          clientSubmissionId: this.clientSubmissionId,
        })
        this.reset()
        return res.responseId
      } catch (e) {
        this.submitError = e.message
        return null
      } finally {
        this.submitting = false
      }
    },
    reset() {
      this.consentGiven = false
      this.demographics = {}
      this.answers = {}
      this.currentIndex = 0
      this.clientSubmissionId = newId()
      sessionStorage.removeItem(KEY)
    },
  },
})
