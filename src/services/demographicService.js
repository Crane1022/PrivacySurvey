import { db, audit, clean, rid, C } from './core'
import { validateDemographic } from '../utils/questions'

// Demographic fields are managed by admins and snapshotted into each questionnaire version on publish.
export async function listDemographics() {
  const s = await db()
  return (await s.list(C.demographics)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}
export async function saveDemographic(d, isNew) {
  const s = await db()
  const errs = validateDemographic(d)
  if (errs.length) throw new Error(errs.join(' '))
  const data = clean({
    id: d.id, label: d.label.trim(), type: d.type, required: !!d.required, order: Number(d.order), status: d.status,
    options: d.options.map(o => ({ value: o.value, label: o.label.trim(), ...(o.other ? { other: true } : {}) })), updatedAt: s.now(),
  })
  if (isNew) await s.set(C.demographics, d.id, { ...data, createdAt: s.now() })
  else await s.update(C.demographics, d.id, data)
  await audit(isNew ? 'demographic.create' : 'demographic.update', `demographic_questions/${d.id}`, { status: d.status })
}
export async function setDemographicStatus(id, status) {
  const s = await db()
  await s.update(C.demographics, id, { status, updatedAt: s.now() })
  await audit('demographic.status', `demographic_questions/${id}`, { status })
}
export const newDemographicId = () => rid('dm')

// Snapshot of the demographic fields a questionnaire would publish with (published fields only, in order).
export async function publishedDemographicSnapshot() {
  return (await listDemographics()).filter(d => d.status === 'published').map(d => ({
    id: d.id, label: d.label, type: d.type, required: !!d.required, options: d.options.map(o => ({ value: o.value, label: o.label, ...(o.other ? { other: true } : {}) })),
  }))
}
