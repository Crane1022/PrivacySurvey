const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) } }
globalThis.localStorage = mem(); globalThis.sessionStorage = mem()
globalThis.crypto ??= (await import('node:crypto')).webcrypto
const { createPinia, setActivePinia } = await import('pinia')
setActivePinia(createPinia())
const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1 } else console.log('ok  ', m) }
const { useAuthStore } = await import('./src/stores/auth.js')
const { useAssessmentStore } = await import('./src/stores/assessment.js')
const S = await import('./src/services/surveyService.js')
const R = await import('./src/services/resultService.js')
const A = await import('./src/services/adminService.js')
const V = await import('./src/utils/validation.js')
const auth = useAuthStore(); await auth.init()
// an admin imports and publishes the real survey first (there is no demo questionnaire)
auth.mockLogin('admin'); await (await import('./fixture.mjs')).seedPublishedSurvey(); await auth.logout()

// validation helpers
ok(V.isEmail('a@b.co') && !V.isEmail('nope'), 'email validation')
ok(V.passwordProblems('abc').length === 2 && V.passwordProblems('abcdefg1').length === 0, 'password policy')
ok(V.safeRedirect('//evil.com', '/d') === '/d' && V.safeRedirect('/assessment/consent', '/d') === '/assessment/consent', 'open redirects rejected')

// registration creates a respondent profile, never a staff role
await auth.register({ displayName: 'Alice', email: 'alice@example.com', password: 'x' })
ok(auth.isAuthed && auth.role === 'respondent' && !auth.isStaff, 'registered user is a respondent')
const aliceUid = auth.user.uid
const users = await A.listUsers()
ok(users.length >= 1 && users.find(u => u.uid === aliceUid)?.role === 'respondent', 'respondent profile document created')
ok(users.find(u => u.uid === aliceUid).assessmentCompleted === false, 'assessmentCompleted starts false')
ok(!JSON.stringify(users).includes('password'), 'no password stored in profile data')
await auth.logout()
try { await auth.register({ displayName: 'Alice 2', email: 'alice@example.com', password: 'x' }); ok(false, 'duplicate email rejected') } catch { ok(true, 'duplicate email rejected') }
try { await auth.login('ghost@example.com', 'x'); ok(false, 'unknown login rejected') } catch { ok(true, 'unknown account cannot log in') }
ok(await auth.login('alice@example.com', 'x') === 'respondent', 'respondent logs in and is routed as respondent')

// assessment: load published questionnaire, answer, submit (double click guarded)
const a = useAssessmentStore(); a.restore()
a.setConsent(true)
await a.loadConfig()
ok(a.totalQuestions === 48, 'published questions loaded')
for (const d of a.config.demographics) a.setDemographic(d.id, d.options[0].value)
ok(a.demographicsComplete, 'demographics complete')
const occ = a.config.demographics.find(d => d.id === 'dm_occupation_sector')
a.setDemographic(occ.id, occ.options.find(o => o.other).value)
ok(!a.demographicsComplete, '"Other" without text is incomplete')
a.setDemographic(occ.id + '__other', 'Researcher')
ok(a.demographicsComplete, '"Other" with text is complete')
ok(a.unansweredRequired.length === 48, 'required answers enforced')
for (const q of a.questions) a.setAnswer(q.questionId, q.options[1].value)
const [r1, r2] = await Promise.all([a.submit(), a.submit()])
ok((r1 && !r2) || (!r1 && r2), 'concurrent double submit creates one submission')
const responseId = r1 || r2
const out = await R.getMyOutcome(responseId)
ok(out.response.respondentId === aliceUid && out.response.questionnaireVersion === 1, 'response belongs to respondent with questionnaire version')
ok(Array.isArray(out.response.answers) && out.response.answers[0].selectedOptionId, 'answers stored as [{questionId, selectedOptionId}]')
ok(out.result?.source === 'browser-test' && out.result.modelVersion.startsWith('weighted-score'), 'test classifier result stored, marked browser-test')
ok(['Privacy Fundamentalist', 'Privacy Pragmatist', 'Privacy Unconcerned'].includes(out.result.classification) && typeof out.result.score === 'number', 'result has a WPSI category and score')
ok(out.result.confidence === null, 'no invented confidence')
ok(out.result.explanation?.factors?.length > 0 && out.result.explanation.summary.length > 20, 'result has an explanation (XAI factors + summary)')
ok(out.response.demographics.dm_occupation_sector__other === 'Researcher', '"Other" text saved with the response')
await R.requestClassification(responseId)
ok((await R.listMyHistory()).length === 1 && (await R.listMyHistory())[0].result, 'retrying classification does not create a second result')
ok((await R.listMyHistory()).length === 1, 'history lists own submissions')
ok(users.find(u => u.uid === aliceUid) && (await A.listUsers()).find(u => u.uid === aliceUid).assessmentCompleted === true, 'profile marked assessmentCompleted')

// another respondent cannot read Alice's data
await auth.logout()
await auth.register({ displayName: 'Bob', email: 'bob@example.com', password: 'x' })
try { await R.getMyOutcome(responseId); ok(false, 'cross-user read blocked') } catch { ok(true, 'respondent cannot open another respondent\'s result') }
ok((await R.listMyHistory()).length === 0, 'history is per respondent')

// restoring saved progress for a different user is refused
a.setConsent(true); a.setAnswer('x', 'y')
await auth.logout()
await auth.login('alice@example.com', 'x')
const a2 = useAssessmentStore(); a2.reset(); a2.restore()
ok(!a2.consentGiven, 'another account\'s saved progress is not restored')

// staff cannot submit; staff roles are not obtainable via respondent paths
await auth.logout(); auth.mockLogin('admin')
ok(auth.isAdmin && auth.isStaff, 'staff session recognised')
try { await S.submitSurvey({ clientSubmissionId: 'x', questionnaireId: 'none', answers: {} }); ok(false, 'staff submission blocked') } catch { ok(true, 'staff cannot submit assessments') }
ok((await R.listAllResults()).length === 1, 'staff can list stored results')
ok((await A.listUsers()).filter(u => u.role === 'respondent').length === 2, 'admin respondent list shows respondents')
