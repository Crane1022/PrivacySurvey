export const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim())

// Reasonable prototype policy: 8+ characters with at least one letter and one number.
export function passwordProblems(v) {
  const p = []
  if (v.length < 8) p.push('at least 8 characters')
  if (!/[A-Za-z]/.test(v)) p.push('a letter')
  if (!/\d/.test(v)) p.push('a number')
  return p
}

// Only same-site paths are accepted as post-login destinations (prevents open redirects).
export const safeRedirect = (v, fallback) => (typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') ? v : fallback)
