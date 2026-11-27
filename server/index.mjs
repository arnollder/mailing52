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
import { ensureWa, getWaQr, getWaStatus, sendWaText } from './wa.mjs'

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
      whatsapp: {
        configured: wa.hasGroupJid,
        status: wa.status,
        open: wa.open,
        lastError: wa.lastError
      }
    })
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
  // Поднимаем WA-сессию заранее (QR появится в этом терминале, если нет .wa-auth)
  ensureWa().catch((err) => {
    console.warn('[wa] bootstrap:', err instanceof Error ? err.message : err)
  })
})
