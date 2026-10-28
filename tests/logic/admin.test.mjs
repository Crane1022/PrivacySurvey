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

const { seedPublishedSurvey } = await import('./fixture.mjs')

// no demo/sample content exists any more
try { await S.getSurveyConfig(); ok(false, 'no demo questionnaire') } catch (e) { ok(/No questionnaire/.test(e.message), 'starts empty: no demo questionnaire is seeded') }
ok((await A.listQuestions()).length === 0 && (await A.listDemographics()).length === 0, 'starts empty: no demo questions or demographic fields')

// import the real survey document and publish it as v1
const imp = await seedPublishedSurvey()
ok(imp.questions === 48 && imp.demographics === 4 && !!imp.questionnaireId, 'import saved 48 questions + 4 demographic fields + a draft questionnaire')
let cfg = await S.getSurveyConfig()
ok(cfg.questionnaireVersion === 1 && cfg.questions.length === 48 && cfg.demographics.length === 4, 'respondent gets imported published v1 (48 questions)')
ok(cfg.questions[4].scenario.startsWith('Scenario 1:') && cfg.questions[4].options.length === 5, 'scenario outcomes carry their scenario text and the 1–5 scale')
ok(cfg.demographics.find(d => d.id === 'dm_occupation_sector').options.some(o => o.other), 'occupation "Other" keeps its text-box flag through publish')
// re-importing the same file updates in place (same ids) instead of duplicating
const { applyImport } = await import('./src/import/importService.js')
const { importSurveyDocx } = await import('./fixture.mjs')
await applyImport(await importSurveyDocx(), { createQuestionnaire: false })
ok((await A.listQuestions()).length === 48, 're-import updates the same 48 questions (no duplicates)')

// admin adds a question to the bank
const nq = Q.blankQuestion(6); nq.questionText = 'Do you reuse passwords?'; nq.options[0].label = 'Never'; nq.options[1].label = 'Sometimes'; nq.status = 'published'
await A.saveQuestion(nq, true)
ok((await A.listQuestions()).length === 49, 'question added to bank')
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
ok(list.find(x => x.version === 1).questions.length === 48, 'v1 snapshot unchanged')

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
ok(dcfg.demographics.length === 4, 'v2 published with 4 demographic fields snapshotted')
const nd = Q.blankDemographic(4, D.newDemographicId()); nd.label = 'Occupation'; nd.options[0].label = 'Student'; nd.options[1].label = 'Employed'; nd.status = 'published'
await D.saveDemographic(nd, true)
ok((await S.getSurveyConfig()).demographics.length === 4, 'new demographic field does not alter the live published version')
try { await D.saveDemographic({ ...nd, label: '' }, false); ok(false, 'invalid demographic rejected') } catch { ok(true, 'invalid demographic rejected') }

// submit stores response with version; duplicates collapse
const payload = { questionnaireId: cfg.questionnaireId, questionnaireVersion: 2, consentVersion: 'v1', consentGiven: true, demographics: {}, answers: { a: 1 }, clientSubmissionId: 'sub-1' }
await auth.logout(); await auth.register({ displayName: 'R', email: 'r@example.com', password: 'x' })
const sub1 = await S.submitSurvey(payload); await S.submitSurvey(payload).catch(() => {})
ok(sub1.resultStatus === 'pending', 'unscorable answers are saved and left pending (no invented result)')
await auth.logout(); auth.mockLogin('admin')
const rs = await A.listResponses()
ok(rs.length === 1 && rs[0].questionnaireVersion === 2, 'response stored once with questionnaire version')
ok((await A.listAudit()).length > 5, 'audit trail written')

// no published demographic fields -> publish blocked
for (const d of await D.listDemographics()) await D.setDemographicStatus(d.id, 'archived')
await A.setQuestionStatus(nq.questionId, 'published')
try { await A.publishQuestionnaire(v3); ok(false, 'publish blocked without demographics') } catch (e) { ok(e.problems?.some(p => p.includes('demographic')), 'publish blocked without published demographic fields') }

// closed survey flag
const st = await A.getSettings(); await A.saveSettings({ ...st, surveyOpen: false })
ok((await S.getSurveyConfig()).surveyOpen === false, 'closed flag reaches respondent config')
