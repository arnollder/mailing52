/**
 * WhatsApp через Baileys.
 * Сессия: .wa-auth/  ·  группа: WA_GROUP_JID в .env
 *
 * Без getMessage / receipt-confirm WA часто врёт «отправил», а в чате пусто.
 * На проде — один инстанс. Локально: WA_SKIP_CONNECT=1.
 */
import { mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import qrcode from 'qrcode-terminal'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

/** WAMessageStatus.SERVER_ACK */
const SERVER_ACK = 2
const MSG_STORE_MAX = 200
const ACK_WAIT_MS = 20_000
const GROUP_META_TTL_MS = 60_000

function authDir() {
  return resolve(ROOT, process.env.WA_AUTH_DIR || '.wa-auth')
}

function waLogger() {
  return pino({ level: process.env.WA_LOG_LEVEL || 'silent' })
}

function skipConnect() {
  return process.env.WA_SKIP_CONNECT === '1'
}

/** @type {ReturnType<typeof makeWASocket> | null} */
let sock = null
let connecting = null
let lastQr = null
let status = 'idle' // idle | qr | connecting | open | close
let lastError = null

/** @type {Map<string, object>} */
const msgStore = new Map()
/** @type {Map<string, { meta: object, at: number }>} */
const groupCache = new Map()

function rememberMessage(id, message) {
  if (!id || !message) return
  msgStore.set(id, message)
  while (msgStore.size > MSG_STORE_MAX) {
    const oldest = msgStore.keys().next().value
    msgStore.delete(oldest)
  }
}

function cacheGroup(jid, meta) {
  if (!jid || !meta) return
  groupCache.set(jid, { meta, at: Date.now() })
}

function cachedGroup(jid, maxAgeMs = GROUP_META_TTL_MS) {
  const hit = groupCache.get(jid)
  if (!hit) return null
  if (Date.now() - hit.at > maxAgeMs) return null
  return hit.meta
}

export function getWaStatus() {
  return {
    status,
    open: status === 'open',
    hasGroupJid: Boolean(process.env.WA_GROUP_JID),
    groupJid: process.env.WA_GROUP_JID || null,
    authDir: authDir(),
    lastQr: Boolean(lastQr),
    lastError,
    skipConnect: skipConnect()
  }
}

/** Сырая строка QR для скана / HTML-страницы. */
export function getWaQr() {
  return lastQr
}

/** Мета группы рассылки (если сессия open). */
export async function getWaGroupInfo(jid = process.env.WA_GROUP_JID) {
  if (!jid) return null
  if (status !== 'open' || !sock) {
    const stale = groupCache.get(jid)?.meta
    return {
      id: jid,
      subject: stale?.subject ?? null,
      size: stale?.participants?.length ?? null,
      announce: stale ? Boolean(stale.announce) : undefined
    }
  }

  const cached = cachedGroup(jid)
  if (cached) {
    return {
      id: cached.id || jid,
      subject: cached.subject || null,
      size: cached.participants?.length ?? null,
      announce: Boolean(cached.announce)
    }
  }

  try {
    const meta = await sock.groupMetadata(jid)
    cacheGroup(jid, meta)
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
  if (skipConnect()) {
    throw new Error('WA_SKIP_CONNECT=1 — локально не трогаем сессию (прод держит Baileys)')
  }
  // sock уже есть на qr/connecting/open — второй makeWASocket убивает сессию
  if (sock && status !== 'close' && status !== 'idle') return sock
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

  const logger = waLogger()
  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    logger,
    browser: Browsers.ubuntu('mailing52'),
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    getMessage: async (key) => {
      const id = key?.id
      if (!id) return undefined
      return msgStore.get(id) || undefined
    },
    cachedGroupMetadata: async (jid) => cachedGroup(jid, GROUP_META_TTL_MS * 10) || undefined
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('groups.update', (updates) => {
    for (const u of updates) {
      if (!u.id) continue
      const prev = groupCache.get(u.id)?.meta || {}
      cacheGroup(u.id, { ...prev, ...u })
    }
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      lastQr = qr
      status = 'qr'
      console.log('[wa] QR готов → /api/wa/qr')
      // ASCII в journalctl — портянка; включай WA_QR_TERMINAL=1 если надо в SSH
      if (process.env.WA_QR_TERMINAL === '1') {
        console.log('\n[wa] WhatsApp → Связанные устройства → Привязать устройство\n')
        qrcode.generate(qr, { small: true })
      }
    }

    if (connection === 'open') {
      status = 'open'
      lastQr = null
      lastError = null
      console.log('[wa] connected')
      const jid = process.env.WA_GROUP_JID
      if (jid && sock) {
        sock.groupMetadata(jid)
          .then((meta) => cacheGroup(jid, meta))
          .catch(() => {})
      }
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
      if (!loggedOut && !skipConnect()) {
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
    ? 'Ждёт скана QR → /api/wa/qr'
    : `WhatsApp не открылся (${status}${lastError ? `: ${lastError}` : ''})`)
}

export async function listGroups() {
  const s = await waitUntilOpen()
  const map = await s.groupFetchAllParticipating()
  for (const g of Object.values(map)) {
    cacheGroup(g.id, g)
  }
  return Object.values(map).map(g => ({
    id: g.id,
    subject: g.subject,
    size: g.participants?.length ?? 0,
    announce: Boolean(g.announce)
  }))
}

/**
 * Подписка ДО sendMessage: receipt часто прилетает раньше, чем успеешь повесить listener.
 * 1:1 → messages.update(status >= SERVER_ACK)
 * группы → message-receipt.update
 */
function armSendConfirm(s, timeoutMs = ACK_WAIT_MS) {
  /** @type {(v: { via: string, status?: number, receipt?: object|null }) => void} */
  let resolveFn
  /** @type {(e: Error) => void} */
  let rejectFn
  const done = new Promise((resolve, reject) => {
    resolveFn = resolve
    rejectFn = reject
  })

  let settled = false
  /** @type {string|null} */
  let msgId = null
  /** @type {Array<{ kind: 'status'|'receipt', id: string, status?: number, receipt?: object|null }>} */
  const early = []

  const timer = setTimeout(() => {
    cleanup()
    if (!settled) {
      settled = true
      rejectFn(new Error(`WhatsApp не подтвердил сообщение за ${Math.round(timeoutMs / 1000)}с (зависло в PENDING)`))
    }
  }, timeoutMs)

  function cleanup() {
    clearTimeout(timer)
    s.ev.off('messages.update', onMsgUpdate)
    s.ev.off('message-receipt.update', onReceipt)
  }

  function finish(payload) {
    if (settled) return
    settled = true
    cleanup()
    resolveFn(payload)
  }

  function matchEarly() {
    if (!msgId) return
    for (const e of early) {
      if (e.id !== msgId) continue
      if (e.kind === 'status') finish({ via: 'status', status: e.status })
      else finish({ via: 'receipt', receipt: e.receipt || null, status: SERVER_ACK })
      return
    }
  }

  function onMsgUpdate(ups) {
    for (const u of ups) {
      const id = u.key?.id
      const st = u.update?.status
      if (!id || typeof st !== 'number' || st < SERVER_ACK) continue
      if (!msgId) {
        early.push({ kind: 'status', id, status: st })
        continue
      }
      if (id === msgId) finish({ via: 'status', status: st })
    }
  }

  function onReceipt(ups) {
    for (const u of ups) {
      const id = u.key?.id
      if (!id) continue
      if (!msgId) {
        early.push({ kind: 'receipt', id, receipt: u.receipt || null })
        continue
      }
      if (id === msgId) {
        finish({ via: 'receipt', receipt: u.receipt || null, status: SERVER_ACK })
      }
    }
  }

  s.ev.on('messages.update', onMsgUpdate)
  s.ev.on('message-receipt.update', onReceipt)

  return {
    /** @param {string|null} id */
    setMsgId(id) {
      msgId = id
      matchEarly()
    },
    promise: done,
    /** Снять listeners без reject (если ack не нужен). */
    dispose() {
      if (settled) return
      settled = true
      cleanup()
    }
  }
}

export async function sendWaText(text, jid = process.env.WA_GROUP_JID) {
  if (skipConnect()) {
    return { ok: false, error: 'WA_SKIP_CONNECT=1 — шлём только с прода' }
  }
  if (!jid) {
    return { ok: false, error: 'WA_GROUP_JID не задан в .env' }
  }
  try {
    const s = await waitUntilOpen(90_000)

    if (!cachedGroup(jid, GROUP_META_TTL_MS * 10)) {
      try {
        const meta = await s.groupMetadata(jid)
        cacheGroup(jid, meta)
      } catch (err) {
        return {
          ok: false,
          error: `Нет доступа к группе ${jid}: ${err instanceof Error ? err.message : String(err)}`
        }
      }
    }

    const confirm = armSendConfirm(s)
    let sent
    try {
      sent = await s.sendMessage(jid, { text })
    } catch (err) {
      confirm.dispose()
      throw err
    }

    const id = sent?.key?.id || null
    if (id && sent?.message) {
      rememberMessage(id, sent.message)
    }
    confirm.setMsgId(id)

    const initialStatus = typeof sent?.status === 'number' ? sent.status : 0
    let confirmed = null
    if (id && initialStatus < SERVER_ACK) {
      confirmed = await confirm.promise
    } else {
      confirm.dispose()
      confirmed = { via: 'immediate', status: initialStatus }
    }

    return {
      ok: true,
      jid,
      id,
      status: confirmed?.status ?? SERVER_ACK,
      confirm: confirmed?.via || null
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}
