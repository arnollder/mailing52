#!/usr/bin/env node
/**
 * Тест отправки в группу WhatsApp.
 * Usage: pnpm wa:send "текст" [jid]
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

const text = process.argv[2] || `mailing52 baileys test ${new Date().toISOString()}`
const jid = process.argv[3] || process.env.WA_GROUP_JID

const { sendWaText } = await import('../server/wa.mjs')
const result = await sendWaText(text, jid)
console.log(JSON.stringify(result, null, 2))
process.exit(result.ok ? 0 : 1)
