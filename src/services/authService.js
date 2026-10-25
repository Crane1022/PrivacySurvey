// Firebase Authentication wrapper (live mode only). The auth store calls this; components never import firebase/auth directly.
const STAFF = ['admin', 'researcher']

// Staff roles come only from the verified custom claim. Anyone else signed in is a respondent.
export const roleFromToken = tok => (STAFF.includes(tok?.claims?.role) ? tok.claims.role : 'respondent')

export function friendlyAuthError(e, ctx = 'login') {
  const code = e?.code ?? ''
  if (code === 'auth/email-already-in-use') return 'An account with this email already exists. Try signing in instead.'
  if (code === 'auth/weak-password') return 'That password is too weak. Use at least 8 characters with letters and numbers.'
  if (code === 'auth/invalid-email') return ctx === 'login' ? 'Incorrect email or password.' : 'Enter a valid email address.'
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(code)) return 'Incorrect email or password.'
  if (code === 'auth/user-disabled') return 'This account has been disabled. Contact the project administrator.'
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please wait a few minutes and try again.'
  if (code === 'auth/network-request-failed') return 'Network error. Check your connection and try again.'
  if (code === 'auth/operation-not-allowed') return 'Email/password sign-in is not enabled for this Firebase project.'
  return e?.message?.startsWith('This account') || e?.message?.includes('not configured') ? e.message : 'Sign-in failed. Please try again.'
}

async function fb() {
  const m = await import('./firebase')
  m.requireFirebase()
  return m
}

// Resolves once the initial auth state (session restore after refresh) is known, then keeps listening.
export async function watchAuth(onChange) {
  const m = await import('./firebase')
  if (!m.firebaseConfigured) return false
  const { onAuthStateChanged } = await import('firebase/auth')
  await new Promise(resolve => {
    let first = true
    onAuthStateChanged(m.auth, async u => {
      await onChange(u)
      if (first) { first = false; resolve() }
    })
  })
  return true
}

export async function signIn(email, password, remember = true) {
  const { auth } = await fb()
  const a = await import('firebase/auth')
  await a.setPersistence(auth, remember ? a.browserLocalPersistence : a.browserSessionPersistence)
  return (await a.signInWithEmailAndPassword(auth, email, password)).user
}
export async function registerAccount(email, password, displayName) {
  const { auth } = await fb()
  const a = await import('firebase/auth')
  const cred = await a.createUserWithEmailAndPassword(auth, email, password) // duplicate emails are rejected by Firebase Auth
  await a.updateProfile(cred.user, { displayName })
  a.sendEmailVerification(cred.user).catch(() => {}) // optional: verification is encouraged, not required
  return cred.user
}
export async function sendReset(email) {
  const { auth } = await fb()
  const a = await import('firebase/auth')
  try { await a.sendPasswordResetEmail(auth, email) } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e // never reveal whether an account exists
  }
}
export async function resendVerification() {
  const { auth } = await fb()
  const a = await import('firebase/auth')
  if (auth.currentUser) await a.sendEmailVerification(auth.currentUser)
}
export async function signOutUser() {
  const { auth } = await fb()
  const { signOut } = await import('firebase/auth')
  await signOut(auth)
}
export async function getIdToken() {
  const { auth } = await import('./firebase')
  return auth?.currentUser ? auth.currentUser.getIdToken() : null
}
