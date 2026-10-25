import { db, clean, C } from './core'

// users/{uid}: respondent profile. Identity lives in Firebase Auth; passwords are never stored here.
// `role` is only ever written as "respondent" from the client; staff roles come from custom claims set by the Admin SDK.
export async function getProfile(uid) {
  const s = await db()
  return s.get(C.users, uid)
}
export async function findProfileByEmail(email) { // mock mode login lookup
  const s = await db()
  return s.queryOne(C.users, 'email', email)
}
export async function createProfile(uid, { displayName, email, emailVerified = false, consentVersion = null }) {
  const s = await db()
  await s.set(C.users, uid, clean({
    uid, displayName, email, role: 'respondent', emailVerified,
    registrationConsentVersion: consentVersion, registrationConsentAt: s.now(),
    createdAt: s.now(), updatedAt: s.now(), lastLoginAt: s.now(), assessmentCompleted: false,
  }))
}
// Safe to call repeatedly: repairs a missing profile (e.g. registration was interrupted after the Auth account was created).
export async function ensureProfile(user) {
  const existing = await getProfile(user.uid)
  if (existing) return existing
  await createProfile(user.uid, { displayName: user.displayName || user.email.split('@')[0], email: user.email, emailVerified: !!user.emailVerified })
  return getProfile(user.uid)
}
export async function touchLogin(uid, emailVerified) {
  const s = await db()
  const patch = { lastLoginAt: s.now(), updatedAt: s.now() }
  if (typeof emailVerified === 'boolean') patch.emailVerified = emailVerified
  await s.update(C.users, uid, patch)
}
export async function updateDisplayName(uid, displayName) {
  const s = await db()
  await s.update(C.users, uid, { displayName: displayName.trim(), updatedAt: s.now() })
}
export async function markAssessmentCompleted(uid) {
  const s = await db()
  await s.update(C.users, uid, { assessmentCompleted: true, updatedAt: s.now() })
}
