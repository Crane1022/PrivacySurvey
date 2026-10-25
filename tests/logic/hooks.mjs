import fs from 'fs'
import { fileURLToPath } from 'url'
export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx) } catch (e) {
    if (spec.startsWith('.') && ctx.parentURL) {
      const base = new URL(spec, ctx.parentURL)
      for (const s of ['.js', '/index.js']) {
        const p = fileURLToPath(base) + s
        if (fs.existsSync(p)) return next(base.href + s, ctx)
      }
    }
    throw e
  }
}
