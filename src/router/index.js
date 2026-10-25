import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAssessmentStore } from '../stores/assessment'

import Landing from '../views/Landing.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import ForgotPassword from '../views/ForgotPassword.vue'
import StaffLogin from '../views/StaffLogin.vue'
import AdminLayout from '../components/admin/AdminLayout.vue'

const assessmentMeta = { requiresAuth: true, respondentOnly: true }
const ADMIN = { requiresRole: 'admin' }
const STAFF = { requiresRole: 'staff' } // researcher or admin

const research = ['survey', 'demographics', 'segmentation', 'ml', 'clusters', 'reports']
const researchTitles = {
  survey: 'Survey Analytics', demographics: 'Demographic Insights', segmentation: 'Privacy Segmentation',
  ml: 'Machine Learning Insights', clusters: 'Clustering Analysis', reports: 'Reports',
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
  routes: [
    { path: '/', name: 'landing', component: Landing, meta: { bare: true } },

    // Authentication (respondents and staff share one Firebase project; permissions differ)
    { path: '/login', name: 'login', component: Login, meta: { bare: true, guestOnly: true } },
    { path: '/register', name: 'register', component: Register, meta: { bare: true, guestOnly: true } },
    { path: '/forgot-password', name: 'forgot-password', component: ForgotPassword, meta: { bare: true, guestOnly: true } },
    { path: '/staff/login', name: 'staff-login', component: StaffLogin, meta: { bare: true, guestOnly: true } },

    // Respondent area
    { path: '/dashboard', name: 'dashboard', component: () => import('../views/Dashboard.vue'), meta: { requiresAuth: true, respondentOnly: true } },
    { path: '/survey', redirect: { name: 'consent' } },
    { path: '/assessment/consent', name: 'consent', component: () => import('../views/Consent.vue'), meta: assessmentMeta },
    { path: '/assessment/demographics', name: 'demographics', component: () => import('../views/Demographics.vue'), meta: { ...assessmentMeta, needsConsent: true } },
    { path: '/assessment/questions', name: 'assessment', component: () => import('../views/Assessment.vue'), meta: { ...assessmentMeta, needsConsent: true, needsDemographics: true } },
    { path: '/assessment/review', name: 'review', component: () => import('../views/Review.vue'), meta: { ...assessmentMeta, needsConsent: true, needsDemographics: true } },
    { path: '/assessment/result/:id', name: 'result', component: () => import('../views/Result.vue'), meta: { requiresAuth: true } },

    // Staff portal (admin + researcher). Access is enforced by Firestore rules and the backend; these guards are UX.
    {
      path: '/staff', component: AdminLayout, meta: { area: 'staff', ...STAFF },
      children: [
        { path: '', redirect: { name: 'staff-dashboard' } },
        { path: 'dashboard', name: 'staff-dashboard', component: () => import('../views/staff/StaffHome.vue'), meta: { area: 'staff', ...STAFF, title: 'Overview' } },
        { path: 'questions', name: 'admin-questions', component: () => import('../views/admin/QuestionBank.vue'), meta: { area: 'staff', ...ADMIN, title: 'Question Bank' } },
        { path: 'questionnaires', name: 'admin-questionnaires', component: () => import('../views/admin/QuestionnaireManagement.vue'), meta: { area: 'staff', ...ADMIN, title: 'Questionnaire Management' } },
        { path: 'demographic-questions', name: 'admin-demographics', component: () => import('../views/admin/DemographicQuestions.vue'), meta: { area: 'staff', ...ADMIN, title: 'Demographic Questions' } },
        { path: 'responses', name: 'admin-responses', component: () => import('../views/admin/SurveyResponses.vue'), meta: { area: 'staff', ...ADMIN, title: 'Survey Responses' } },
        { path: 'results', name: 'staff-results', component: () => import('../views/staff/PrivacyResults.vue'), meta: { area: 'staff', ...STAFF, title: 'Privacy Profiling Results' } },
        { path: 'analytics', name: 'admin-analytics', component: () => import('../views/admin/AdminAnalytics.vue'), meta: { area: 'staff', ...ADMIN, title: 'Research Analytics' } },
        { path: 'ml-info', name: 'admin-ml', component: () => import('../views/admin/MlModelInfo.vue'), meta: { area: 'staff', ...ADMIN, title: 'ML Model Information' } },
        { path: 'users', name: 'admin-users', component: () => import('../views/admin/UserRoles.vue'), meta: { area: 'staff', ...ADMIN, title: 'User & Role Management' } },
        { path: 'settings', name: 'admin-settings', component: () => import('../views/admin/SystemSettings.vue'), meta: { area: 'staff', ...ADMIN, title: 'System Settings' } },
        ...research.map(section => ({
          path: `research/${section}`, name: `research-${section}`, component: () => import('../views/ResearchPage.vue'),
          meta: { area: 'staff', ...STAFF, section, title: researchTitles[section] },
        })),
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async to => {
  const auth = useAuthStore()
  const needsAuthState = to.matched.some(r => r.meta.requiresAuth || r.meta.requiresRole || r.meta.guestOnly)
  if (needsAuthState) await auth.init()

  // Already signed in: skip the login/register pages
  if (to.meta.guestOnly && auth.isAuthed) return auth.isStaff ? { name: 'staff-dashboard' } : { name: 'dashboard' }

  // Staff areas
  const needed = to.matched.map(r => r.meta.requiresRole).find(Boolean)
  if (needed) {
    if (!auth.isAuthed) return { name: 'staff-login', query: { redirect: to.fullPath } }
    if (!auth.isStaff) return { name: 'dashboard' } // a respondent can never open staff routes
    if (needed === 'admin' && !auth.isAdmin) return { name: 'staff-dashboard' } // researchers cannot reach admin-only pages
  }

  // Signed-in respondents only. Staff may enter the assessment solely through an admin preview.
  if (to.meta.requiresAuth) {
    if (!auth.isAuthed) return { name: 'login', query: { redirect: to.fullPath } }
  }
  const assessment = useAssessmentStore()
  if (to.meta.respondentOnly || to.meta.needsConsent) {
    assessment.restore()
    if (auth.isStaff && !assessment.isPreview && to.meta.respondentOnly) return { name: 'staff-dashboard' }
  }
  if (to.meta.needsConsent || to.meta.needsDemographics) {
    if (!assessment.consentGiven) return { name: 'consent' }
    if (to.meta.needsDemographics) {
      await assessment.loadConfig()
      if (!assessment.consentGiven) return { name: 'consent' } // questionnaire changed since the session started
      if (assessment.config && !assessment.demographicsComplete) return { name: 'demographics' }
    }
  }
  return true
})

export default router
