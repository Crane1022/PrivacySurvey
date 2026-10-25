// Browser-only stand-in for Firestore (mock mode). Clearly demonstration storage: NOT secure, NOT shared.
const key = c => `wpsi_mock_${c}`
const read = c => { try { return JSON.parse(localStorage.getItem(key(c)) || '{}') } catch { return {} } }
const write = (c, v) => localStorage.setItem(key(c), JSON.stringify(v))

export const store = {
  now: () => new Date().toISOString(),
  async list(col, { orderBy, desc = true, limit } = {}) {
    let rows = Object.entries(read(col)).map(([id, d]) => ({ id, ...d }))
    if (orderBy) rows.sort((a, b) => (String(a[orderBy] ?? '') < String(b[orderBy] ?? '') ? -1 : 1) * (desc ? -1 : 1))
    return limit ? rows.slice(0, limit) : rows
  },
  async get(col, id) {
    const d = read(col)[id]
    return d ? { id, ...d } : null
  },
  async query(col, filters = [], { limit } = {}) {
    const rows = Object.entries(read(col)).map(([id, d]) => ({ id, ...d })).filter(r => filters.every(([f, , v]) => r[f] === v))
    return limit ? rows.slice(0, limit) : rows
  },
  async queryOne(col, field, value) {
    const hit = Object.entries(read(col)).find(([, d]) => d[field] === value)
    return hit ? { id: hit[0], ...hit[1] } : null
  },
  async set(col, id, data) { const all = read(col); all[id] = data; write(col, all) },
  async update(col, id, patch) { const all = read(col); all[id] = { ...(all[id] ?? {}), ...patch }; write(col, all) },
  async batch(ops) { for (const o of ops) await this[o.op](o.col, o.id, o.data) },
}
