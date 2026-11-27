#!/usr/bin/env node
/**
 * Тест отправки с ЛОКАЛЬНОЙ сессии (.wa-auth-local).
 * Usage: pnpm wa:send "текст" [jid]
 */
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from '../server/load-env.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

loadEnv(resolve(ROOT, '.env'))

process.env.WA_PROFILE = 'local'
process.env.WA_AUTH_DIR = process.env.WA_AUTH_DIR_LOCAL || process.env.WA_AUTH_DIR || '.wa-auth-local'
process.env.WA_DEVICE_NAME = process.env.WA_DEVICE_NAME || 'mailing52-dev'
process.env.WA_ALLOW_CONNECT = '1'
process.env.WA_SKIP_CONNECT = '0'

const text = process.argv[2] || `mailing52 baileys test ${new Date().toISOString()}`
const jid = process.argv[3] || process.env.WA_GROUP_JID

const { sendWaText } = await import('../server/wa.mjs')
const result = await sendWaText(text, jid)
console.log(JSON.stringify(result, null, 2))
process.exit(result.ok ? 0 : 1)
