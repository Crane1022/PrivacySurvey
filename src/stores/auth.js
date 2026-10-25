import { defineStore } from 'pinia'
import { config } from '../config'
import * as authService from '../services/authService'
import * as users from '../services/userService'
import { getSettings } from '../services/settingsService'

const MOCK_KEY = 'wpsi_mock_session'
const STAFF = ['admin', 'researcher']
const rid = () => `mock-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

// Identity comes from Firebase Auth; staff role from the verified custom claim `role`. Everything else signed in is a
// "respondent". In live mode no role value is editable client state. Route guards are UX only: Firestore rules and the
// backend enforce access.
export const useAuthStore = defineStore('auth', {
  state: () => ({ user: null, role: null, ready: false, initPromise: null, registering: false, profileError: '' }),
  getters: {
    isAuthed: s => !!s.user,
    isAdmin: s => s.role === 'admin',
    isResearcher: s => s.role === 'researcher' || s.role === 'admin',
    isStaff: s => STAFF.includes(s.role),
    isRespondent: s => s.role === 'respondent',
  },
  actions: {
    init() {
      if (!this.initPromise) this.initPromise = this._init()
      return this.initPromise
    },
    async _init() {
      try {
        if (config.isMock) {
          const m = JSON.parse(sessionStorage.getItem(MOCK_KEY) || 'null')
          if (m) { this.user = m.user; this.role = m.role }
        } else {
          await authService.watchAuth(u => this._apply(u)) // restores the session after a refresh
        }
      } catch { /* stay signed out */ }
      this.ready = true
    },
    async _apply(u, forceRefresh = false) {
      if (!u) { this.user = null; this.role = null; return }
      this.user = { uid: u.uid, email: u.email, displayName: u.displayName || '', emailVerified: !!u.emailVerified }
      this.role = authService.roleFromToken(await u.getIdTokenResult(forceRefresh))
      if (this.registering) return // register() writes the profile itself
      try {
        this.profileError = ''
        if (this.role === 'respondent') await users.ensureProfile(u)
        await users.touchLogin(u.uid, !!u.emailVerified)
      } catch (e) { this.profileError = e.message } // do not block sign-in on a profile write
    },
    async login(email, password, { remember = true } = {}) {
      if (config.isMock) {
        const p = await users.findProfileByEmail(email)
        if (!p) throw new Error('No demonstration account with this email. Create one first (passwords are not checked in demo mode).')
        this._mockSession({ uid: p.uid, email: p.email, displayName: p.displayName, emailVerified: true }, 'respondent')
        await users.touchLogin(p.uid)
        return this.role
      }
      const user = await authService.signIn(email, password, remember)
      await this._apply(user, true) // refresh so freshly assigned claims are picked up
      return this.role
    },
    async register({ displayName, email, password }) {
      const consentVersion = (await getSettings().catch(() => ({}))).consentVersion ?? null
      if (config.isMock) {
        if (await users.findProfileByEmail(email)) throw new Error('An account with this email already exists. Try signing in instead.')
        const uid = rid()
        await users.createProfile(uid, { displayName, email, consentVersion })
        this._mockSession({ uid, email, displayName, emailVerified: false }, 'respondent')
        return
      }
      this.registering = true
      try {
        const user = await authService.registerAccount(email, password, displayName)
        await this._apply(user, true)
        try {
          await users.createProfile(user.uid, { displayName, email, emailVerified: false, consentVersion })
        } catch (e) {
          // Partial failure: the Auth account exists but the profile write failed. It is repaired automatically at next sign-in.
          const err = new Error('Your account was created, but saving your profile failed. Sign in again to finish setting it up.')
          err.partial = true
          err.cause = e
          throw err
        }
      } finally { this.registering = false }
    },
    _mockSession(user, role) {
      this.user = user
      this.role = role
      sessionStorage.setItem(MOCK_KEY, JSON.stringify({ user, role }))
    },
    // Mock mode only (demonstration staff). No effect in live mode.
    mockLogin(role) {
      if (!config.isMock) return
      this._mockSession({ uid: 'mock-' + role, email: `demo-${role}@example.test`, displayName: `Demo ${role}`, emailVerified: true }, role)
    },
    async logout() {
      if (config.isMock) sessionStorage.removeItem(MOCK_KEY)
      else await authService.signOutUser()
      this.user = null
      this.role = null
      const { useAssessmentStore } = await import('./assessment')
      useAssessmentStore().exitPreview() // never leave one person's answers in the browser for the next
    },
    async resetPassword(email) { if (!config.isMock) await authService.sendReset(email) },
    async resendVerification() { if (!config.isMock) await authService.resendVerification() },
    async renameSelf(name) {
      await users.updateDisplayName(this.user.uid, name)
      if (!config.isMock) {
        const { auth } = await import('../services/firebase')
        const { updateProfile } = await import('firebase/auth')
        await updateProfile(auth.currentUser, { displayName: name })
      }
      this.user = { ...this.user, displayName: name }
      if (config.isMock) this._mockSession(this.user, this.role)
    },
    getToken() { return config.isMock ? Promise.resolve(null) : authService.getIdToken() },
  },
})
