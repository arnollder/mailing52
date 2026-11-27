#!/usr/bin/env node
/**
 * Третья (локальная) сессия WhatsApp через QR.
 * Пишет ТОЛЬКО в .wa-auth-local — прод (.wa-auth на сервере) не трогает.
 *
 * Usage: pnpm wa:login
 */
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from '../server/load-env.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

loadEnv(resolve(ROOT, '.env'))

process.env.WA_PROFILE = 'local'
process.env.WA_AUTH_DIR = process.env.WA_AUTH_DIR_LOCAL || '.wa-auth-local'
process.env.WA_DEVICE_NAME = process.env.WA_DEVICE_NAME || 'mailing52-dev'
process.env.WA_ALLOW_CONNECT = '1'
process.env.WA_SKIP_CONNECT = '0'
process.env.WA_QR_TERMINAL = process.env.WA_QR_TERMINAL || '1'

const authAbs = resolve(ROOT, process.env.WA_AUTH_DIR)
if (authAbs.includes('/opt/mailing52') || process.env.WA_AUTH_DIR === '.wa-auth') {
  console.error('[wa:login] отказ: нельзя логиниться в продовый auth dir')
  console.error('  сейчас:', authAbs)
  console.error('  для этого ПК используй .wa-auth-local (дефолт)')
  process.exit(1)
}

const { ensureWa, listGroups, waitUntilOpen, getWaStatus, authDir } = await import('../server/wa.mjs')

console.log('[wa:login] профиль local · device', process.env.WA_DEVICE_NAME)
console.log('[wa:login] auth →', authDir())
console.log('[wa:login] WhatsApp → Связанные устройства → Привязать устройство')
console.log('[wa:login] прод на сервере не задеваем (другой QR / другой каталог)\n')

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
