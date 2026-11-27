#!/usr/bin/env node
/**
 * Минимальный API рассылки. Токены только из env / .env
 * POST /api/urgent  { text, channels: ["max", "whatsapp", ...] }
 * GET  /api/health
 * Защищено MAILING52_API_KEY: urgent, wa/qr, wa/status
 */
import { createServer } from 'node:http'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'
import { loadEnv } from './load-env.mjs'
import { ensureWa, getWaGroupInfo, getWaQr, getWaStatus, sendWaText } from './wa.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

loadEnv(resolve(ROOT, '.env'))

const PORT = Number(process.env.PORT || 3012)
const HOST = process.env.HOST || '127.0.0.1'
const MAX_API = 'https://platform-api2.max.ru'

function json(res, status, body) {
  const raw = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(raw)
  })
  res.end(raw)
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > 64_000) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/** X-Api-Key / Bearer / ?key= */
function extractApiKey(req, url) {
  const header = req.headers['x-api-key']
  if (typeof header === 'string' && header) return header
  const auth = req.headers.authorization
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7)
  const q = url.searchParams.get('key')
  return q || ''
}

function requireApiKey(req, res, url) {
  const expected = process.env.MAILING52_API_KEY || ''
  if (!expected) {
    if (process.env.NODE_ENV === 'production') {
      json(res, 503, { ok: false, error: 'MAILING52_API_KEY не задан на сервере' })
      return false
    }
    return true
  }
  if (extractApiKey(req, url) !== expected) {
    json(res, 401, { ok: false, error: 'нужен API-ключ (X-Api-Key)' })
    return false
  }
  return true
}

async function sendMax(text) {
  const token = process.env.MAX_BOT_TOKEN
  const chatId = process.env.MAX_CHAT_ID
  if (!token || !chatId) {
    return { ok: false, error: 'MAX не настроен (MAX_BOT_TOKEN / MAX_CHAT_ID)' }
  }

  const url = `${MAX_API}/messages?chat_id=${encodeURIComponent(chatId)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text })
  })
  const raw = await res.text()
  let data
  try {
    data = JSON.parse(raw)
  } catch {
    data = { raw }
  }
  if (!res.ok) {
    return { ok: false, error: `MAX HTTP ${res.status}`, detail: data }
  }
  return {
    ok: true,
    url: data?.message?.url,
    mid: data?.message?.body?.mid
  }
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    return { ok: false, error: 'Telegram не настроен (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)' }
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  })
  const raw = await res.text()
  let data
  try {
    data = JSON.parse(raw)
  } catch {
    data = { raw }
  }
  if (!res.ok || !data.ok) {
    return {
      ok: false,
      error: data?.description || `Telegram HTTP ${res.status}`,
      detail: data
    }
  }
  return {
    ok: true,
    messageId: data?.result?.message_id ?? null,
    chatId: data?.result?.chat?.id ?? chatId
  }
}

const ALLOWED_CHANNELS = new Set(['telegram', 'max', 'whatsapp'])

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  if (req.method === 'GET' && url.pathname === '/api/health') {
    const wa = getWaStatus()
    return json(res, 200, {
      ok: true,
      max: Boolean(process.env.MAX_BOT_TOKEN && process.env.MAX_CHAT_ID),
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      apiKey: Boolean(process.env.MAILING52_API_KEY),
      whatsapp: {
        configured: wa.hasGroupJid,
        status: wa.status,
        open: wa.open,
        lastError: wa.lastError
      }
    })
  }

  // Публичные статусы каналов (без токенов и без путей auth)
  if (req.method === 'GET' && url.pathname === '/api/channels') {
    try {
      const wa = getWaStatus()
      const waGroup = await getWaGroupInfo()

      const tgToken = Boolean(process.env.TELEGRAM_BOT_TOKEN)
      const tgChat = process.env.TELEGRAM_CHAT_ID || null
      let telegramStatus = 'pending'
      if (tgToken && tgChat) telegramStatus = 'connected'
      else if (tgToken || tgChat) telegramStatus = 'offline'

      const maxToken = Boolean(process.env.MAX_BOT_TOKEN)
      const maxChat = process.env.MAX_CHAT_ID || null
      let maxStatus = 'pending'
      if (maxToken && maxChat) maxStatus = 'connected'
      else if (maxToken || maxChat) maxStatus = 'offline'

      let waStatus = 'offline'
      if (wa.open) waStatus = 'connected'
      else if (wa.status === 'qr' || wa.status === 'connecting') waStatus = 'pending'
      else if (wa.hasGroupJid) waStatus = 'pending'

      return json(res, 200, {
        ok: true,
        channels: [
          {
            id: 'telegram',
            name: 'Telegram',
            short: 'TG',
            status: telegramStatus,
            title: process.env.TELEGRAM_CHAT_TITLE || 'Рассылка Анонимные Наркоманы М52',
            chatId: tgChat,
            hasToken: tgToken,
            link: process.env.TELEGRAM_CHANNEL_LINK || 'https://t.me/mailing_m52',
            botUsername: process.env.TELEGRAM_BOT_USERNAME || 'ArnolderBot',
            hint: telegramStatus === 'connected'
              ? `Бот @${process.env.TELEGRAM_BOT_USERNAME || 'ArnolderBot'} · токен в .env`
              : 'Нужны TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в .env',
            detail: null,
            needs: [
              'Канал https://t.me/mailing_m52',
              'Бот @ArnolderBot — админ с правом публиковать',
              'TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID в .env'
            ]
          },
          {
            id: 'max',
            name: 'MAX',
            short: 'MX',
            status: maxStatus,
            title: process.env.MAX_CHANNEL_TITLE || 'Рассылка Анонимные Наркоманы М52',
            chatId: maxChat,
            hasToken: maxToken,
            link: process.env.MAX_CHANNEL_LINK || 'https://max.ru/se15171561_biz',
            botUsername: process.env.MAX_BOT_USERNAME || 'se15171561_bot',
            hint: maxStatus === 'connected'
              ? `Бот @${process.env.MAX_BOT_USERNAME || 'se15171561_bot'} · токен в .env`
              : 'Нужны MAX_BOT_TOKEN и MAX_CHAT_ID в .env',
            detail: null,
            needs: [
              `Канал ${process.env.MAX_CHANNEL_LINK || 'https://max.ru/se15171561_biz'}`,
              `Бот @${process.env.MAX_BOT_USERNAME || 'se15171561_bot'}`,
              'MAX_BOT_TOKEN + MAX_CHAT_ID в .env'
            ]
          },
          {
            id: 'whatsapp',
            name: 'WhatsApp',
            short: 'WA',
            status: waStatus,
            title: waGroup?.subject || process.env.WA_GROUP_TITLE || 'Группа рассылки',
            chatId: wa.groupJid,
            hasToken: false,
            link: process.env.WA_INVITE_LINK || null,
            botUsername: null,
            hint: wa.open
              ? `Baileys · сессия open${waGroup?.size != null ? ` · ${waGroup.size} уч.` : ''}`
              : wa.status === 'qr'
                ? 'Ждёт скана QR (нужен API-ключ)'
                : 'Baileys · WA_GROUP_JID + сессия .wa-auth',
            detail: wa.lastError || (wa.status !== 'open' ? `baileys:${wa.status}` : null),
            needs: [
              'Одна группа WhatsApp на местность',
              'Сессия Baileys (.wa-auth) на сервере',
              'WA_GROUP_JID=…@g.us в .env',
              'Раз в ~14 дней открыть WA на телефоне'
            ],
            wa: {
              session: wa.status,
              open: wa.open,
              qr: Boolean(wa.lastQr),
              size: waGroup?.size ?? null
            }
          }
        ]
      })
    } catch (err) {
      return json(res, 500, {
        ok: false,
        error: err instanceof Error ? err.message : 'channels error'
      })
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/wa/status') {
    if (!requireApiKey(req, res, url)) return
    const { authDir: _authDir, ...safe } = getWaStatus()
    return json(res, 200, { ok: true, ...safe })
  }

  // QR локально (png data-URL), без сторонних сервисов. Нужен API-ключ.
  if (req.method === 'GET' && url.pathname === '/api/wa/qr') {
    if (!requireApiKey(req, res, url)) return
    const qr = getWaQr()
    const st = getWaStatus()
    if (st.open) {
      const html = `<!doctype html><meta charset="utf-8"><title>WA</title>
        <body style="font:16px system-ui;padding:2rem"><p>WhatsApp уже подключён.</p></body>`
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      return res.end(html)
    }
    if (!qr) {
      const html = `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="2">
        <title>WA QR</title><body style="font:16px system-ui;padding:2rem">
        <p>Ждём QR… статус: <b>${st.status}</b>. Страница обновится сама.</p></body>`
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      return res.end(html)
    }
    const img = await QRCode.toDataURL(qr, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M'
    })
    const html = `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="15">
      <title>WhatsApp QR</title>
      <body style="font:16px system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#111;color:#eee">
        <div style="text-align:center">
          <h1 style="font-size:1.1rem;font-weight:600">Сканируй WhatsApp → Связанные устройства</h1>
          <img src="${img}" alt="QR" width="320" height="320" style="background:#fff;padding:12px;border-radius:12px"/>
          <p style="opacity:.7;margin-top:1rem">Обновляется раз в 15с · ${st.status}</p>
        </div>
      </body>`
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    return res.end(html)
  }

  if (req.method === 'POST' && url.pathname === '/api/urgent') {
    if (!requireApiKey(req, res, url)) return
    try {
      const raw = await readBody(req)
      const body = raw ? JSON.parse(raw) : {}
      const text = typeof body.text === 'string' ? body.text.trim() : ''
      const channels = Array.isArray(body.channels)
        ? body.channels.filter(c => ALLOWED_CHANNELS.has(c))
        : []

      if (text.length < 5) {
        return json(res, 400, { ok: false, error: 'Текст слишком короткий' })
      }
      if (!channels.length) {
        return json(res, 400, { ok: false, error: 'Не выбран канал' })
      }

      /** @type {Record<string, { ok?: boolean, error?: string }>} */
      const results = {}
      const jobs = []
      if (channels.includes('max')) {
        jobs.push(sendMax(text).then(r => { results.max = r }))
      }
      if (channels.includes('telegram')) {
        jobs.push(sendTelegram(text).then(r => { results.telegram = r }))
      }
      if (channels.includes('whatsapp')) {
        jobs.push(sendWaText(text).then(r => { results.whatsapp = r }))
      }
      await Promise.all(jobs)

      const anyOk = Object.values(results).some(r => r && r.ok)
      const allOk = channels.every(c => results[c]?.ok)

      return json(res, anyOk ? 200 : 502, {
        ok: anyOk,
        allOk,
        results
      })
    } catch (err) {
      return json(res, 500, {
        ok: false,
        error: err instanceof Error ? err.message : 'server error'
      })
    }
  }

  json(res, 404, { ok: false, error: 'not found' })
})

server.listen(PORT, HOST, () => {
  console.log(`mailing52-api http://${HOST}:${PORT}`)
  if (!process.env.MAILING52_API_KEY && process.env.NODE_ENV === 'production') {
    console.warn('[api] MAILING52_API_KEY пуст — urgent/QR закрыты (503)')
  }
  if (process.env.WA_SKIP_CONNECT === '1' || (process.env.WA_SKIP_CONNECT !== '0' && process.env.WA_ALLOW_CONNECT !== '1' && process.env.NODE_ENV !== 'production' && process.env.WA_PROFILE !== 'prod')) {
    console.log('[wa] bootstrap skipped (local profile / WA_SKIP_CONNECT)')
    return
  }
  ensureWa().catch((err) => {
    console.warn('[wa] bootstrap:', err instanceof Error ? err.message : err)
  })
})
