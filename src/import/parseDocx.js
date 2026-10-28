// Reads a Word (.docx) survey written in the project's format and turns it into an import model.
//
// Format the parser understands (same as Privacy_Survey_Questions.docx):
//   • "Heading 1" lines start a section. A heading containing "Demographic" is the demographic section.
//   • A top-level bullet/numbered item is a question (or a demographic field).
//   • Indented items under it are its answer options.
//   • Plain lines that name a scale set the answer options for questions WITHOUT their own options:
//       "4-Point Agreement Scale", "5-Point agreement scale", "Response Score 1–5",
//       "Choose from Yes, Maybe, No", "... Very unlikely ... Very likely"
//     (a scale line straight after a question applies to that question; otherwise it applies to the questions that follow)
//   • "Scenario 1", "Scenario 2" … start a scenario; the plain lines after it are the scenario text,
//     and each bullet after "Outcomes:" is one question shown with that scenario.
//   • An option starting with "Other" becomes "Other (please specify)" with a text box.
import { emptyModel } from './model'

export const SCALES = [
  { key: 'agree4', test: /4[\s-]*point\s+agreement/i, type: 'likert', labels: ['Strongly disagree', 'Disagree', 'Agree', 'Strongly agree'] },
  { key: 'agree5', test: /5[\s-]*point\s+agreement/i, type: 'likert', labels: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'] },
  { key: 'likely1to5', test: /response\s+score\s*1\s*[–-]\s*5|1\s*=\s*not at all likely/i, type: 'likert', labels: ['1 – Not at all likely', '2 – Slightly likely', '3 – Moderately likely', '4 – Very likely', '5 – Extremely likely'] },
  { key: 'yesMaybeNo', test: /\byes\b.{0,8}\bmaybe\b.{0,8}\bno\b/i, type: 'single', labels: ['Yes', 'Maybe', 'No'] },
  { key: 'unlikely5', test: /very\s+unlikely/i, type: 'likert', labels: ['Very unlikely', 'Unlikely', 'Neutral', 'Likely', 'Very likely'] },
]
const matchScale = text => SCALES.find(s => s.test.test(text)) ?? null

// ---------- 1. .docx file → paragraphs ----------
const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

export function paragraphsFromXml(xml) {
  const out = []
  for (const p of xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []) {
    const text = decode((p.match(/<w:t(?: [^>]*)?>[^<]*<\/w:t>|<w:tab\/>/g) ?? [])
      .map(t => (t === '<w:tab/>' ? ' ' : t.replace(/<[^>]+>/g, ''))).join('')).replace(/\s+/g, ' ').trim()
    if (!text) continue
    const style = p.match(/<w:pStyle w:val="([^"]+)"/)?.[1] ?? ''
    const isList = p.includes('<w:numPr>')
    const level = isList ? Number(p.match(/<w:ilvl w:val="(\d+)"/)?.[1] ?? 0) : -1
    out.push({ text, style, isList, level })
  }
  return out
}

export async function readDocx(arrayBuffer) {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(arrayBuffer)
  const file = zip.file('word/document.xml')
  if (!file) throw new Error('This file is not a valid Word (.docx) document.')
  return paragraphsFromXml(await file.async('string'))
}

// ---------- 2. paragraphs → import model ----------
const STOP = new Set(['and', 'of', 'the', 'questions', 'question', 'section', 'user', 'users'])
function sectionPrefix(title) {
  const words = title.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w))
  if (!words.length) return 'q'
  return words.length === 1 ? words[0].slice(0, 10) : 'u' + words.map(w => w[0]).join('').slice(0, 4)
}
const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').split('_').slice(0, 4).join('_')
const isHeading = st => /^heading\s?1$|^heading1$|^title$/i.test(st)

export function parseSurveyParagraphs(paras) {
  const m = emptyModel()
  let section = null, kind = null, prefix = '', counter = 0
  let subsection = '', sticky = null, seenItem = false
  let scenario = null, scenarioCount = 0, outcomeCount = 0
  let field = null, last = null

  const assign = (q, scale) => {
    q.type = scale.type
    q.options = scale.labels.slice()
    q.scaleKey = scale.key
    q.pending = false
  }
  const finalize = () => {
    if (last?.pending) {
      if (sticky) assign(last, sticky)
      else m.warnings.push({ level: 'error', ref: last.questionId, text: `No answer options or scale found for "${last.questionText.slice(0, 60)}".` })
      last.pending = false
    }
  }

  for (const p of paras) {
    if (isHeading(p.style)) {
      finalize()
      section = p.text.replace(/\s+$/, '')
      kind = /demograph/i.test(section) ? 'demo' : 'q'
      prefix = sectionPrefix(section)
      counter = 0; subsection = ''; seenItem = false; scenario = null; field = null; last = null
      continue
    }
    if (!section) continue

    if (kind === 'demo') {
      if (p.isList && p.level === 0) {
        field = { id: 'dm_' + slug(p.text), label: p.text, options: [], required: true }
        m.demographics.push(field)
      } else if (p.isList && field) {
        const other = /^other\b/i.test(p.text)
        field.options.push(other ? { label: 'Other (please specify)', other: true } : { label: p.text })
      }
      continue
    }

    if (!p.isList) {
      const scale = matchScale(p.text)
      if (scale) { if (last?.pending) assign(last, scale); sticky = scale; continue }
      if (/^scenario\s*\d+/i.test(p.text)) {
        finalize()
        scenario = { n: ++scenarioCount, parts: [], started: false }
        outcomeCount = 0
        continue
      }
      if (/^outcomes?\s*:?$/i.test(p.text)) { if (scenario) scenario.started = true; continue }
      if (scenario && !scenario.started) { scenario.parts.push(p.text); continue }
      if (!seenItem || /^\(.*\)$/.test(p.text)) continue // section description / "(Multiple-Choice Questions)"
      finalize()
      subsection = p.text
      scenario = null
      continue
    }

    if (p.level === 0) {
      finalize()
      seenItem = true
      const id = scenario ? `sc${scenario.n}_o${++outcomeCount}` : `${prefix}_q${++counter}`
      last = {
        questionId: id, section: subsection || section,
        scenario: scenario ? `Scenario ${scenario.n}: ${scenario.parts.join(' ')}` : '',
        questionText: p.text, type: 'single', options: [], isRequired: true, pending: true,
      }
      m.questions.push(last)
    } else if (last) {
      last.options.push(p.text)
      last.pending = false
    }
  }
  finalize()
  m.questions.forEach(q => { delete q.pending })
  return m
}
