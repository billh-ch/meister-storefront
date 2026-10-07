import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const root = new URL('../../', import.meta.url)
registerHooks({
  resolve(specifier, context, nextResolve) {
    const url = specifier.startsWith('@/')
      ? new URL(specifier.slice(2), root)
      : specifier.startsWith('.') && context.parentURL
        ? new URL(specifier, context.parentURL)
        : null
    if (url?.protocol === 'file:') {
      for (const suffix of ['.ts', '/index.ts']) {
        const candidate = new URL(url.href + suffix)
        if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context)
      }
    }
    return nextResolve(specifier, context)
  },
})
