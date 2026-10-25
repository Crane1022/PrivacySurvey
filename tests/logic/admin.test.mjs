const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) } }
globalThis.localStorage = mem(); globalThis.sessionStorage = mem()
const { createPinia, setActivePinia } = await import('pinia')
setActivePinia(createPinia())
const { useAuthStore } = await import('./src/stores/auth.js')
const auth = useAuthStore(); await auth.init(); auth.mockLogin('admin')
const A = await import('./src/services/adminService.js')
const S = await import('./src/services/surveyService.js')
const Q = await import('./src/utils/questions.js')
const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1 } else console.log('ok  ', m) }

// seeded published demo questionnaire is what respondents get
let cfg = await S.getSurveyConfig()
ok(cfg.questionnaireVersion === 1 && cfg.questions.length === 5, 'respondent gets seeded published v1 (5 questions)')

// admin adds a question to the bank
const nq = Q.blankQuestion(6); nq.questionText = 'Do you reuse passwords?'; nq.options[0].label = 'Never'; nq.options[1].label = 'Sometimes'; nq.status = 'published'
await A.saveQuestion(nq, true)
ok((await A.listQuestions()).length === 6, 'question added to bank')
let bad = Q.blankQuestion(7); bad.questionText = ''
try { await A.saveQuestion(bad, true); ok(false, 'invalid question rejected') } catch { ok(true, 'invalid question rejected') }

// draft v2 -> add questions -> publish
const id = await A.createDraft({ title: 'Real v2', description: '' })
let d = (await A.listQuestionnaires()).find(x => x.questionnaireId === id)
ok(d.version === 2 && d.status === 'draft', 'draft is version 2')
const bank = await A.listQuestions()
await A.saveDraft(id, { title: 'Real v2', description: '', questions: [bank.find(b => b.questionId === nq.questionId), bank[0]] })
await A.publishQuestionnaire(id)
cfg = await S.getSurveyConfig()
ok(cfg.questionnaireVersion === 2 && cfg.questions.length === 2 && cfg.questions[0].questionText === 'Do you reuse passwords?', 'respondent now sees published v2 in admin order')
const list = await A.listQuestionnaires()
ok(list.find(x => x.version === 1).status === 'archived', 'v1 archived, kept for history')
ok(list.find(x => x.version === 1).questions.length === 5, 'v1 snapshot unchanged')

// editing the bank does not alter the published snapshot
const edited = { ...nq, questionText: 'CHANGED' }
await A.saveQuestion(edited, false)
cfg = await S.getSurveyConfig()
ok(cfg.questions[0].questionText === 'Do you reuse passwords?', 'bank edit does not alter published snapshot')

// published cannot be saved as draft
try { await A.saveDraft(id, { title: 'x', description: '', questions: [] }); ok(false, 'published immutable') } catch { ok(true, 'published questionnaire is immutable') }

// ML lock blocks incompatible publish, allows identical
await A.lockMlSchemaToPublished()
const v3 = await A.createNewVersionFrom(id)
const bank2 = await A.listQuestions()
await A.saveDraft(v3, { title: 'v3', description: '', questions: [bank2.find(b => b.questionId === nq.questionId)] })
try { await A.publishQuestionnaire(v3); ok(false, 'ML lock blocks incompatible') } catch (e) { ok(e.problems?.length > 0, 'ML schema lock blocks incompatible publish: ' + e.problems[0]) }
cfg = await S.getSurveyConfig(); ok(cfg.questionnaireVersion === 2, 'blocked publish left v2 live')

// archived bank question blocks publish
await A.unlockMlSchema()
await A.setQuestionStatus(nq.questionId, 'archived')
try { await A.publishQuestionnaire(v3); ok(false, 'archived question blocks') } catch (e) { ok(e.problems?.some(p => p.includes('archived')), 'archived question blocks publish') }

// demographics: snapshotted at publish from published demographic fields
const D = await import('./src/services/demographicService.js')
let dcfg = await S.getSurveyConfig()
ok(dcfg.demographics.length === 3, 'v2 published with 3 demographic fields snapshotted')
const nd = Q.blankDemographic(4, D.newDemographicId()); nd.label = 'Occupation'; nd.options[0].label = 'Student'; nd.options[1].label = 'Employed'; nd.status = 'published'
await D.saveDemographic(nd, true)
ok((await S.getSurveyConfig()).demographics.length === 3, 'new demographic field does not alter the live published version')
try { await D.saveDemographic({ ...nd, label: '' }, false); ok(false, 'invalid demographic rejected') } catch { ok(true, 'invalid demographic rejected') }

// submit stores response with version; duplicates collapse
const payload = { questionnaireId: cfg.questionnaireId, questionnaireVersion: 2, consentVersion: 'v1', consentGiven: true, demographics: {}, answers: { a: 1 }, clientSubmissionId: 'sub-1' }
await auth.logout(); await auth.register({ displayName: 'R', email: 'r@example.com', password: 'x' })
await S.submitSurvey(payload); await S.submitSurvey(payload)
await auth.logout(); auth.mockLogin('admin')
const rs = await A.listResponses()
ok(rs.length === 1 && rs[0].questionnaireVersion === 2, 'response stored once with questionnaire version')
ok(Array.isArray(rs[0].questionSnapshot) && rs[0].questionSnapshot.length === 2, 'response stores the question snapshot of its version')
ok((await A.listAudit()).length > 5, 'audit trail written')

// no published demographic fields -> publish blocked
for (const d of await D.listDemographics()) await D.setDemographicStatus(d.id, 'archived')
await A.setQuestionStatus(nq.questionId, 'published')
try { await A.publishQuestionnaire(v3); ok(false, 'publish blocked without demographics') } catch (e) { ok(e.problems?.some(p => p.includes('demographic')), 'publish blocked without published demographic fields') }

// closed survey flag
const st = await A.getSettings(); await A.saveSettings({ ...st, surveyOpen: false })
ok((await S.getSurveyConfig()).surveyOpen === false, 'closed flag reaches respondent config')
