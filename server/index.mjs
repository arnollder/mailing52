#!/usr/bin/env node
/**
 * Минимальный API рассылки. Токены только из env / .env
 * POST /api/urgent  { text, channels: ["max", "whatsapp", ...] }
 * GET  /api/health
 */
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureWa, getWaGroupInfo, getWaQr, getWaStatus, sendWaText } from './wa.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

function loadEnv(path) {
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      if (process.env[m[1]] === undefined) process.env[m[1]] = m[2]
    }
  } catch {
    /* optional */
  }
}

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

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  if (req.method === 'GET' && url.pathname === '/api/health') {
    const wa = getWaStatus()
    return json(res, 200, {
      ok: true,
      max: Boolean(process.env.MAX_BOT_TOKEN && process.env.MAX_CHAT_ID),
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      whatsapp: {
        configured: wa.hasGroupJid,
        status: wa.status,
        open: wa.open,
        lastError: wa.lastError
      }
    })
  }

  // Публичные статусы каналов (без токенов) — для UI «Каналы»
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
      else if (wa.hasGroupJid) waStatus = 'pending' // JID есть, сессия не open на этом процессе

      return json(res, 200, {
        ok: true,
        channels: [
          {
            id: 'telegram',
            name: 'Telegram',
            short: 'TG',
            status: telegramStatus,
            title: process.env.TELEGRAM_CHAT_TITLE || 'Канал рассылки',
            chatId: tgChat,
            hasToken: tgToken,
            link: process.env.TELEGRAM_CHANNEL_LINK || null,
            botUsername: process.env.TELEGRAM_BOT_USERNAME || null,
            hint: telegramStatus === 'connected'
              ? 'Bot API · токен в .env'
              : 'Нужны TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в .env',
            detail: null,
            needs: [
              'Канал / супергруппа рассылки местности',
              'Токен бота от @BotFather',
              'Бот — админ с правом публиковать',
              'TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID в .env на сервере'
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
                ? 'Ждёт скана QR (/api/wa/qr)'
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
              qr: wa.lastQr,
              authDir: wa.authDir,
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
    return json(res, 200, { ok: true, ...getWaStatus() })
  }

  // QR в браузере — удобнее, чем ловить ASCII в терминале агента
  if (req.method === 'GET' && url.pathname === '/api/wa/qr') {
    const qr = getWaQr()
    const st = getWaStatus()
    if (st.open) {
      const html = `<!doctype html><meta charset="utf-8"><title>WA</title>
        <body style="font:16px system-ui;padding:2rem"><p>WhatsApp уже подключён.</p>
        <p><a href="/api/wa/status">status</a></p></body>`
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
    const img = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qr)}`
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
    try {
      const raw = await readBody(req)
      const body = raw ? JSON.parse(raw) : {}
      const text = typeof body.text === 'string' ? body.text.trim() : ''
      const channels = Array.isArray(body.channels) ? body.channels : []

      if (text.length < 5) {
        return json(res, 400, { ok: false, error: 'Текст слишком короткий' })
      }
      if (!channels.length) {
        return json(res, 400, { ok: false, error: 'Не выбран канал' })
      }

      const results = {}

      if (channels.includes('max')) {
        results.max = await sendMax(text)
      }
      if (channels.includes('telegram')) {
        results.telegram = { ok: false, error: 'Telegram ещё не подключён' }
      }
      if (channels.includes('whatsapp')) {
        results.whatsapp = await sendWaText(text)
      }

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
  // WA_SKIP_CONNECT=1 — не трогать сессию (удобно локально, пока прод держит Baileys)
  if (process.env.WA_SKIP_CONNECT === '1') {
    console.log('[wa] bootstrap skipped (WA_SKIP_CONNECT=1)')
    return
  }
  ensureWa().catch((err) => {
    console.warn('[wa] bootstrap:', err instanceof Error ? err.message : err)
  })
})
