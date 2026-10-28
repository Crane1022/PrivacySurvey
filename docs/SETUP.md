# Privacy Profiling System: setup, security and integration guide

## 0. Honest status (read first)
| Area | Status |
|---|---|
| Survey import (.docx/.csv/.json), test classifier, explanations (XAI), "Other" text box | **Tested**: logic tests (76 checks) + a full browser run in local mode. |
| App logic on the browser-only mock store: registration/login, respondent isolation, publish/versioning, ML-schema lock, demographic snapshots, duplicate-submit guard, staff restrictions | **Tested**: `npm run test:logic` (46 checks). |
| Firebase Authentication, Cloud Firestore and the security rules against a real project | **Written, NOT tested.** No network or Firebase project was available while building. Use the live checklist in section 9. |
| `npm run build` | **Not run** here (offline; the uploaded `node_modules` holds Windows-only binaries). Run it on your machine. |
| UI/responsive behaviour | Vue files compile and all imports/routes resolve, but pages were **not viewed in a browser** here. Please review each screen at desktop/tablet/mobile widths. |
| Classification | A **test classifier** (src/ml) runs in the browser until the FastAPI model exists (`VITE_CLASSIFIER_MODE=local`). Results are marked `source: browser-test` and show a "test classifier" note. Switch to `api` when the backend is ready. |

## 1. Install, run, build
```
npm install
cp .env.example .env        # VITE_DATA_MODE=mock needs no Firebase
npm run dev                 # development
npm run build               # production build -> dist/
npm run preview             # serve the production build
npm run test:logic          # data-layer tests (mock store)
```
Mock mode: everything lives in the browser, accounts are demonstration only (passwords are neither checked nor stored), and the result page shows a fixed,
clearly flagged demonstration sample. Staff demo buttons exist only in mock mode.

## 2. Firebase project setup (live mode)
1. Firebase console → create a project (separate projects for development and production).
2. **Authentication** → Sign-in method → enable **Email/Password**. In Templates you can customise the verification and password-reset emails.
3. **Firestore Database** → create (production mode).
4. Project settings → Your apps → add a **Web app**; put these four values in `.env`: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`. Set `VITE_DATA_MODE=live` and `VITE_API_BASE_URL`. Use `.env.development` / `.env.production`
   for separate projects. These values are not secrets; **never** put a service-account key in `.env` or any `VITE_*` variable.
5. **Deploy the rules**: `npm i -g firebase-tools && firebase login && firebase use <project-id> && firebase deploy --only firestore:rules`
   (or paste `firestore.rules` into Firestore → Rules → Publish). Redeploy after any change.
6. Authentication → Settings → Authorized domains: add your site's domain.
7. `npm run build`, then host `dist/` (`firebase deploy --only hosting` uses `firebase.json`, which rewrites all paths to `index.html`).
8. First run: sign in as admin, then **System Settings** (set the consent version and survey open), **Demographic Questions** (publish the approved fields),
   **Question Bank**, **Questionnaire Management** (publish). Until a questionnaire is published, respondents see "No questionnaire is currently published".

## 3. Create the first administrator safely
Admin/researcher status is a Firebase **custom claim** (`role`) that only the Admin SDK can set. A respondent cannot register as staff and the rules block
client writes to `role`.
1. Project settings → Service accounts → Generate new private key. Store it **outside the repo**; delete it from your downloads afterwards.
2. `npm install --no-save firebase-admin`
3. Existing account: `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node scripts/set-role.mjs you@example.com admin`
   New account: prefix with `FIRST_ADMIN_PASSWORD='one-time-strong-password'` to create it, then change the password after signing in.
4. Sign in at `/staff/login`. Add researchers the same way with role `researcher`.
5. The user must sign out and in again after a role change (claims refresh at sign-in).
Later role changes through the UI call `PUT /api/admin/users/{uid}/role` (backend, below). Until it exists, keep using the script.

## 4. Routes and roles
| Route | Who |
|---|---|
| `/`, `/login`, `/register`, `/forgot-password` | everyone (login/register redirect signed-in users away) |
| `/dashboard`, `/assessment/*` | signed-in respondents. Logged-out visitors are sent to `/login?redirect=…` and continue afterwards. Staff only enter via an admin **preview**. |
| `/staff/login` | staff. A respondent who tries is rejected and signed out; staff signing in at `/login` are redirected to the portal |
| `/staff/dashboard`, `/staff/results`, `/staff/research/*` | researcher + admin |
| `/staff/questions`, `/questionnaires`, `/demographic-questions`, `/responses`, `/analytics`, `/ml-info`, `/users`, `/settings` | admin only |
Route guards are UX. Enforcement is Firestore rules and backend token verification.

## 5. Respondent journey as implemented
Landing → Register/Login → Dashboard → Consent → Demographics → Published questionnaire → Review → Submit → Result.
- **Register**: Firebase Auth account → profile `users/{uid}` (role fixed to `respondent`) → verification email (encouraged, not required; dashboard shows a reminder).
  If the profile write fails after the account is created, sign-in repairs the profile automatically.
- **Submit (live)**: the client writes `survey_responses/{clientSubmissionId}` (create-only rule: no duplicates, no edits). Success is shown only after that write
  succeeds, then the client calls `POST /api/survey/classify`. If the backend is unreachable the response stays saved and the result page shows "pending" with a
  retry button.
- **Result**: read from `privacy_results` (own records only). Confidence, explanation and recommendations appear only if the backend stored them.

## 6. Firestore structure
| Collection | Written by | Notes |
|---|---|---|
| `users/{uid}` | client (own profile, safe fields) / script | uid, displayName, email, role, emailVerified, registrationConsentVersion/At, createdAt, updatedAt, lastLoginAt, assessmentCompleted |
| `survey_questions/{questionId}` | admin | questionText, scenario, section, type (single/multiple/likert/dropdown), options[{value,label}], isRequired, order, status (draft/published/archived). Never deleted |
| `demographic_questions/{id}` | admin | label, type (radio/select), options, required, order, status |
| `questionnaires/{id}` | admin | title, description, version, status, **questions[] and demographics[] snapshots**, createdAt, updatedAt, publishedAt, publishedBy, archivedAt. Frozen once published |
| `survey_responses/{responseId}` | respondent (create-only) | respondentId, questionnaireId, questionnaireVersion, consentVersion, demographics, answers[{questionId, selectedOptionId \| selectedOptionIds}], status, submittedAt |
| `privacy_results/{resultId}` | **backend only** | respondentId, responseId, questionnaireVersion, classification, modelVersion, confidence, explanation, recommendations, createdAt |
| `model_metrics`, `dashboard_statistics` | **backend only** | staff-readable |
| `admin_audit_logs/{id}` | admin (append-only) | action, target, details, actorUid, actorEmail, createdAt |
| `system_settings/app` (public), `/ml_schema` (admin) | admin | surveyOpen, consentVersion, enabledQuestionTypes / locked, features |
Mapping to your sample schema: `questionType`→`type` (`single_choice`→`single`), `required`→`isRequired`, `status: active`→`published`, option `id`→`value`. The sample
questions/scoring values were structural examples and were not copied. No scoring rules exist in the frontend.

## 7. Backend contract (FastAPI): still to implement
Verify the Firebase ID token (`Authorization: Bearer`) and the `role` claim; add a CORS allow-list.
- `POST /api/survey/classify` `{responseId}` (respondent token): load `survey_responses/{responseId}`, require `respondentId == token.uid`; re-validate the answers against the
  questionnaire version stored on the response (question ids, option values, required, multiple); on invalid data mark the response rejected; otherwise run the approved
  preprocessing + model, write `privacy_results` (classification, modelVersion, questionnaireVersion, and confidence/explanation only if the model produced them),
  set the response's processed status. Idempotent: calling twice must not create two results. If the model is unavailable, return an error (the UI shows "pending").
- Staff only: `GET /api/admin/overview`, `/demographics`, `/survey-analysis`, `/model-metrics`, `/clusters` (shapes: see `src/mock/dashboardMock.js`) and
  `PUT /api/admin/users/{uid}/role` (sets the custom claim and mirrors `users.role`).
- The rules check consent, ownership and the published version, but cannot iterate over every answer: server-side validation of each answer is the backend's job.
- A copy of the question snapshot on each response is recommended for audit; take it from the stored questionnaire version, never from the client.

## 8. Redesign notes
Design tokens live at the top of `src/assets/main.css` (Coastal Editorial palette, Instrument Sans + Instrument Serif Italic loaded from Google Fonts; coral buttons use
dark ink text for contrast). The hero image is a built-in **SVG illustration** because no licensed photograph could be sourced offline. To use a photo or video, set
`VITE_HERO_IMAGE_URL` (e.g. a licensed file in `/public`) and optionally `VITE_HERO_VIDEO_URL`; the image stays the fallback and video is skipped under
`prefers-reduced-motion`. Entrance animations use CSS and are disabled by the reduced-motion rule.

## 9. Live test checklist (please run and note any failure)
1 Register a respondent → appears in Auth and `users/{uid}` (role respondent). 2 Sign out/in; refresh keeps you signed in; "Remember me" off ends the session when the browser closes.
3 Logged out, click Start Assessment → login → returns to consent. 4 Wrong password and duplicate email show friendly messages. 5 Forgot password sends the email.
6 Complete the assessment → document appears in `survey_responses` with your uid and the version; double-click Submit creates one document.
7 Result page shows "pending" until the backend writes `privacy_results`; no category is shown before that. 8 Dashboard shows only your history.
9 As respondent, open another respondent's `/assessment/result/<id>` → denied; `/staff/dashboard` → redirected; Firestore console-style reads of `users` for another uid → denied.
10 Staff: sign in at `/staff/login`; a respondent account there is rejected. 11 Admin adds/edits a question, refreshes, it persists; archive persists.
12 Publish a questionnaire → respondent sees it; older version unchanged; an archived version cannot be republished (rules). 13 Researcher cannot open admin pages or write questions.
14 Mobile widths (360, 768): landing, auth, assessment, dashboard tables, staff drawer. 15 `npm run build` passes with no console errors.

## 10. Known limitations
Firebase/rules untested live (see section 0); no browser visual review done; recommendations/explanations need backend data; the hero uses an illustration unless you supply
media; report download uses the browser's print dialog ("Save as PDF"); staff dashboards need backend endpoints for real analytics; email verification is encouraged
but not enforced; notifications bell not built.


## 11. Importing the survey (Staff → Import Survey)
1. Upload `Privacy_Survey_Questions.docx` (or a CSV/JSON in the same structure). Nothing is saved yet.
2. Check the preview ("As respondents see it" or "Compact list"). Yellow notes point at things to check, e.g. two options joined by a
   missing line break in Word ("Labuan Melacca", "Selangor Terengganu"). Use **Edit** to fix them; the Word file is not changed.
3. Press **Import**. Questions/fields are saved as *published* in the bank, a draft questionnaire is created, and (optionally) old items are archived.
4. Questionnaire Management → **Preview** (walk through as a respondent) → **Publish**.
- Ids are stable (`baseline_q1`, `sc3_o2`, `ubp_q5`, `dm_age_group`…), so re-importing updates the same items and the classifier settings keep matching.
- For future edits, **Save as CSV** / **Export current question bank (CSV)**, edit in Excel, import again. Template: `public/templates/privacy-survey-template.csv`.
  CSV columns: `kind, id, section, scenario, text, type, options (separated by " | "), required, ml_weight, ml_concern_end`. Write `Other [text]` for an Other option with a text box.
- Word format rules the importer understands are documented at the top of `src/import/parseDocx.js`.

## 12. Test classifier and explanations (Staff → ML Model & Test Lab)
- Code: `src/ml/` — `index.js` (the plug: `classify()` + list of models), `models/weightedScore.js`, `models/westinCore.js`, `explain.js` (XAI), `defaultModelConfig.js` (starting weights).
- **Weighted concern score**: each answer → concern value 0..1 from its position in the option list; score = weighted average; ≥ Fundamentalist threshold / ≤ Unconcerned threshold / otherwise Pragmatist.
  Explanation = each answer's exact share of the score (`weight × (concern − 0.5) / total weight`), so it is a faithful explanation, not an approximation.
- **Westin core rule**: protective on all core statements = Fundamentalist, unprotective on all = Unconcerned, else Pragmatist.
- In the Test Lab you pick test answers and change weights / "most-concerned end" / thresholds; the result and explanation update instantly.
  **Save settings** stores them in `system_settings/ml_model` (version +1). **Re-run on all saved responses** re-classifies existing data.
- `ubp_q14` (install updates without checking reviews) has weight 0 because its privacy direction is unclear. Decide with your supervisor.
- Add a model: create `src/ml/models/myModel.js` with `{ id, name, description, predict({ questions, answers, config }) }` and add it to `MODELS` in `src/ml/index.js`.
- Explanation shape (any future model, including a backend SHAP model, just returns this and the result page shows it):
  `{ method, summary, score, thresholds, factors: [{ questionId, label, section, answer, contribution }], sections: [{ section, score }] }`

### Firestore rules: REDEPLOY after this update
`firestore.rules` now (a) lets signed-in users read `system_settings/ml_model`, and (b) lets a respondent create ONE `privacy_results/res_<responseId>`
for their own response with `source == 'browser-test'` (admins may re-run). Deploy: `firebase deploy --only firestore:rules`.
When the FastAPI backend writes results, delete the marked TEST CLASSIFIER block and set `VITE_CLASSIFIER_MODE=api`.

### Demo data removed
The seeded demo questionnaire, the fixed "Pragmatist" demo result and the sample dashboard numbers are gone. Analytics pages count the real stored
responses/results. Question-level and demographic breakdowns need an admin account (survey_responses is admin-only). Clustering and accuracy metrics
appear only when the ML pipeline provides them.
