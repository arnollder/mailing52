/**
 * WhatsApp через Baileys (эксперимент на feat/whatsapp-baileys).
 * Сессия: .wa-auth/  ·  группа: WA_GROUP_JID в .env
 */
import { mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import qrcode from 'qrcode-terminal'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

function authDir() {
  return resolve(ROOT, process.env.WA_AUTH_DIR || '.wa-auth')
}

function waLogger() {
  return pino({ level: process.env.WA_LOG_LEVEL || 'silent' })
}

/** @type {ReturnType<typeof makeWASocket> | null} */
let sock = null
let connecting = null
let lastQr = null
let status = 'idle' // idle | qr | connecting | open | close
let lastError = null

export function getWaStatus() {
  return {
    status,
    open: status === 'open',
    hasGroupJid: Boolean(process.env.WA_GROUP_JID),
    groupJid: process.env.WA_GROUP_JID || null,
    authDir: authDir(),
    lastQr: Boolean(lastQr),
    lastError
  }
}

/** Сырая строка QR для скана / HTML-страницы. */
export function getWaQr() {
  return lastQr
}

/** Мета группы рассылки (если сессия open). */
export async function getWaGroupInfo(jid = process.env.WA_GROUP_JID) {
  if (!jid) return null
  if (status !== 'open' || !sock) return { id: jid, subject: null, size: null }
  try {
    const meta = await sock.groupMetadata(jid)
    return {
      id: meta.id,
      subject: meta.subject || null,
      size: meta.participants?.length ?? null,
      announce: Boolean(meta.announce)
    }
  } catch {
    return { id: jid, subject: null, size: null }
  }
}

export async function ensureWa() {
  if (sock && status === 'open') return sock
  if (connecting) return connecting
  connecting = startWa().finally(() => {
    connecting = null
  })
  return connecting
}

async function startWa() {
  const dir = authDir()
  mkdirSync(dir, { recursive: true })
  const { state, saveCreds } = await useMultiFileAuthState(dir)
  const { version } = await fetchLatestBaileysVersion()

  status = 'connecting'
  lastError = null

  sock = makeWASocket({
    version,
    auth: state,
    logger: waLogger(),
    browser: Browsers.ubuntu('mailing52'),
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: false
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      lastQr = qr
      status = 'qr'
      console.log('\n[wa] QR — WhatsApp → Связанные устройства → Привязать устройство\n')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      status = 'open'
      lastQr = null
      lastError = null
      console.log('[wa] connected')
    }

    if (connection === 'close') {
      status = 'close'
      const code = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output?.statusCode
        : undefined
      const loggedOut = code === DisconnectReason.loggedOut
      lastError = lastDisconnect?.error instanceof Error
        ? lastDisconnect.error.message
        : `close:${code ?? 'unknown'}`
      console.warn('[wa] closed', lastError, loggedOut ? '(logged out — удали .wa-auth и снова QR)' : '')

      sock = null
      if (!loggedOut) {
        setTimeout(() => {
          ensureWa().catch((err) => {
            lastError = err instanceof Error ? err.message : String(err)
            console.error('[wa] reconnect failed', lastError)
          })
        }, 2500)
      }
    }
  })

  return sock
}

/**
 * Ждёт open до timeoutMs (для login / первой отправки).
 */
export async function waitUntilOpen(timeoutMs = 120_000) {
  await ensureWa()
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (status === 'open' && sock) return sock
    await new Promise(r => setTimeout(r, 400))
  }
  throw new Error(status === 'qr'
    ? 'Ждёт скана QR (см. терминал API)'
    : `WhatsApp не открылся (${status}${lastError ? `: ${lastError}` : ''})`)
}

export async function listGroups() {
  const s = await waitUntilOpen()
  const map = await s.groupFetchAllParticipating()
  return Object.values(map).map(g => ({
    id: g.id,
    subject: g.subject,
    size: g.participants?.length ?? 0,
    announce: Boolean(g.announce)
  }))
}

export async function sendWaText(text, jid = process.env.WA_GROUP_JID) {
  if (!jid) {
    return { ok: false, error: 'WA_GROUP_JID не задан в .env' }
  }
  try {
    const s = await waitUntilOpen(90_000)
    const sent = await s.sendMessage(jid, { text })
    return {
      ok: true,
      jid,
      id: sent?.key?.id || null
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}
