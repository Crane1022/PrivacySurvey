// Trusted role assignment. Run LOCALLY by a project owner; never ship the service-account key.
//
//   npm install --no-save firebase-admin
//   export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json      # keep this file out of git
//   node scripts/set-role.mjs you@example.com admin                  # existing Firebase user -> admin
//
// First administrator who does not have an account yet: provide a one-time password through the environment
// (not as an argument, so it stays out of shell history), then change it after first sign-in:
//   FIRST_ADMIN_PASSWORD='choose-a-strong-one' node scripts/set-role.mjs you@example.com admin
//
// Roles: admin | researcher. The user must sign out and in again for the new claim to appear in their token.
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const [email, role] = process.argv.slice(2)
if (!email || !['admin', 'researcher'].includes(role)) {
  console.error('Usage: node scripts/set-role.mjs <email> <admin|researcher>')
  process.exit(1)
}
initializeApp({ credential: applicationDefault() })

let user
try {
  user = await getAuth().getUserByEmail(email)
} catch (e) {
  if (e.code !== 'auth/user-not-found' || !process.env.FIRST_ADMIN_PASSWORD) {
    console.error(
      e.code === 'auth/user-not-found'
        ? 'No such user. Create it in the Firebase console, or set FIRST_ADMIN_PASSWORD to create it here.'
        : e.message,
    )
    process.exit(1)
  }
  user = await getAuth().createUser({
    email,
    password: process.env.FIRST_ADMIN_PASSWORD,
    emailVerified: false,
  })
  console.log('Created user', user.uid)
}
await getAuth().setCustomUserClaims(user.uid, { role })
await getFirestore()
  .collection('users')
  .doc(user.uid)
  .set({ uid: user.uid, email, role, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
console.log(`${email} (${user.uid}) is now: ${role}`)
