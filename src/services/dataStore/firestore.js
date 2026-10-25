import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, limit as qLimit,
  writeBatch, serverTimestamp,
} from 'firebase/firestore'
import { db, requireFirebase } from '../firebase'

// Firestore Timestamps -> ISO strings so the UI treats mock and live data the same way.
function plain(v) {
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString()
  if (Array.isArray(v)) return v.map(plain)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]))
  return v
}
const withId = d => ({ id: d.id, ...plain(d.data()) })

const raw = {
  now: () => serverTimestamp(),
  async list(col, { orderBy: field, desc = true, limit } = {}) {
    requireFirebase()
    const parts = [collection(db, col)]
    if (field) parts.push(orderBy(field, desc ? 'desc' : 'asc'))
    if (limit) parts.push(qLimit(limit))
    return (await getDocs(query(...parts))).docs.map(withId)
  },
  async get(col, id) {
    requireFirebase()
    const s = await getDoc(doc(db, col, id))
    return s.exists() ? withId(s) : null
  },
  // Equality filters only (no orderBy, so no composite index is needed). Sort in the caller.
  async query(col, filters = [], { limit } = {}) {
    requireFirebase()
    const parts = [collection(db, col), ...filters.map(([f, op, v]) => where(f, op, v))]
    if (limit) parts.push(qLimit(limit))
    return (await getDocs(query(...parts))).docs.map(withId)
  },
  async queryOne(col, field, value) {
    requireFirebase()
    const s = await getDocs(query(collection(db, col), where(field, '==', value), qLimit(1)))
    return s.empty ? null : withId(s.docs[0])
  },
  async set(col, id, data) { requireFirebase(); await setDoc(doc(db, col, id), data) },
  async update(col, id, patch) { requireFirebase(); await updateDoc(doc(db, col, id), patch) },
  async batch(ops) {
    requireFirebase()
    const b = writeBatch(db)
    for (const o of ops) {
      const ref = doc(db, o.col, o.id)
      if (o.op === 'set') b.set(ref, o.data)
      else b.update(ref, o.data)
    }
    await b.commit()
  },
}

function friendly(e) {
  switch (e?.code) {
    case 'permission-denied': return 'You do not have permission to do that. Sign in again, or ask an administrator to check your role.'
    case 'unauthenticated': return 'Your session has expired. Please sign in again.'
    case 'unavailable': case 'deadline-exceeded': return 'Cannot reach the database. Check your connection and try again.'
    case 'not-found': return 'The requested record was not found.'
    case 'failed-precondition': return 'The database needs an index or is in an unexpected state. Check the browser console for the link to create it.'
    case 'resource-exhausted': return 'The database quota has been reached. Try again later.'
    default: return e?.message || 'Unexpected database error.'
  }
}

// Every operation is wrapped so views receive readable errors instead of raw Firestore exceptions.
export const store = Object.fromEntries(
  Object.entries(raw).map(([k, fn]) => [k, typeof fn !== 'function' ? fn : (...a) => {
    try {
      const r = fn(...a)
      return r && typeof r.then === 'function' ? r.catch(e => { throw new Error(friendly(e), { cause: e }) }) : r
    } catch (e) { throw new Error(friendly(e), { cause: e }) }
  }]),
)
