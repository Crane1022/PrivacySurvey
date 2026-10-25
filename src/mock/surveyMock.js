// DEMONSTRATION DATA ONLY - replace with the approved questionnaire (Firestore / backend).
// Demographic fields below are placeholders until confirmed from the Group 19 proposal.
export const mockSurveyConfig = {
  isDemo: true,
  questionnaireVersion: 'demo-0',
  consentVersion: 'demo-0',
  demographics: [
    {
      id: 'ageGroup', label: 'Age group', type: 'radio', required: true,
      options: ['18-24', '25-34', '35-44', '45-54', '55 and above'].map(v => ({ value: v, label: v })),
    },
    {
      id: 'gender', label: 'Gender', type: 'select', required: true,
      options: ['Female', 'Male', 'Prefer not to say'].map(v => ({ value: v, label: v })),
    },
    {
      id: 'education', label: 'Highest education level', type: 'select', required: true,
      options: ['Secondary', 'Diploma / Foundation', "Bachelor's degree", 'Postgraduate'].map(v => ({ value: v, label: v })),
    },
  ],
  questions: [
    {
      questionId: 'demo-q1', section: 'Everyday sharing', order: 1, isRequired: true,
      scenario: 'A new food-delivery app asks for your location, contacts and photos during sign-up.',
      questionText: 'What would you most likely do?',
      options: [
        'Decline all optional permissions',
        'Allow only what the app needs to work',
        'Read the terms briefly, then allow what is asked',
        'Allow everything so sign-up is quick',
      ],
    },
    {
      questionId: 'demo-q2', section: 'Everyday sharing', order: 2, isRequired: true,
      scenario: 'A shopping website offers 10% off if you agree to personalised advertising.',
      questionText: 'How do you respond?',
      options: [
        'Refuse - my data is not worth a discount',
        'Accept only if I can control what is used',
        'Accept; the discount is a fair trade',
        'Accept without thinking about it',
      ],
    },
    {
      questionId: 'demo-q3', section: 'Organisations and data', order: 3, isRequired: true,
      scenario: 'Your bank emails that it wants to share your transaction history with partner companies.',
      questionText: 'What is your reaction?',
      options: [
        'Close the account if I cannot opt out',
        'Opt out and ask what is shared',
        'Check the details, then decide',
        'No concern - companies need data to operate',
      ],
    },
    {
      questionId: 'demo-q4', section: 'Organisations and data', order: 4, isRequired: true,
      scenario: 'A public Wi-Fi hotspot asks you to log in with your social media account.',
      questionText: 'What do you do?',
      options: [
        'Avoid public Wi-Fi sign-ins entirely',
        'Use a throwaway or limited account',
        'Log in if the venue looks trustworthy',
        'Log in - it is convenient',
      ],
    },
    {
      questionId: 'demo-q5', section: 'Attitudes', order: 5, isRequired: true,
      scenario: 'Government agencies propose collecting more digital-service usage data to improve services.',
      questionText: 'How comfortable are you with this?',
      options: [
        'Not comfortable under any circumstances',
        'Only with strict legal safeguards',
        'Fine if the benefits are clear',
        'Comfortable - I have nothing to hide',
      ],
    },
  ].map(q => ({ ...q, type: 'single', options: q.options.map((label, i) => ({ value: `${q.questionId}-o${i + 1}`, label })) })),
}

// A fixed sample result. It is NOT derived from the respondent's answers.
export const mockResult = {
  isDemo: true,
  resultId: 'demo-result',
  responseId: 'demo-response',
  predictedCategory: 'Privacy Pragmatist',
  modelVersion: 'demo (no model connected)',
  explanation: null,
  recommendations: [],
  createdAt: null,
}
