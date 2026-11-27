#!/usr/bin/env node
/**
 * Локальный логин WhatsApp (Baileys): QR в терминале → список групп.
 * Usage: pnpm wa:login
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv(path) {
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      if (process.env[m[1]] === undefined) process.env[m[1]] = m[2]
    }
  } catch { /* optional */ }
}

loadEnv(resolve(ROOT, '.env'))

if (process.env.WA_SKIP_CONNECT === '1') {
  console.error('[wa:login] WA_SKIP_CONNECT=1 — для логина временно убери из .env (и не делай это, пока прод онлайн на тех же ключах)')
  process.exit(1)
}

const { ensureWa, listGroups, waitUntilOpen, getWaStatus } = await import('../server/wa.mjs')

console.log('[wa:login] auth →', process.env.WA_AUTH_DIR || '.wa-auth')
console.warn('[wa:login] не гоняй на продовых .wa-auth, пока mailing52-api держит сессию')
await ensureWa()
await waitUntilOpen(180_000)
console.log('[wa:login]', getWaStatus())

const groups = await listGroups()
console.log(`\nГруппы (${groups.length}):`)
for (const g of groups) {
  console.log(`- ${g.subject}`)
  console.log(`  ${g.id}  · ${g.size} чел.${g.announce ? ' · только админы' : ''}`)
}

if (!process.env.WA_GROUP_JID && groups[0]) {
  console.log(`\nВ .env добавь:\nWA_GROUP_JID=${groups[0].id}`)
}

process.exit(0)
