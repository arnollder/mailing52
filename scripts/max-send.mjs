#!/usr/bin/env node
/**
 * Отправка в канал MAX из .env
 * Usage: node scripts/max-send.mjs "текст"
 */
import { resolve } from 'node:path'
import { loadEnv } from '../server/load-env.mjs'

loadEnv(resolve(process.cwd(), '.env'))

const token = process.env.MAX_BOT_TOKEN
const chatId = process.env.MAX_CHAT_ID
const text = process.argv.slice(2).join(' ').trim()

if (!token || !chatId) {
  console.error('Нужны MAX_BOT_TOKEN и MAX_CHAT_ID в .env')
  process.exit(1)
}
if (!text) {
  console.error('Usage: node scripts/max-send.mjs "текст сообщения"')
  process.exit(1)
}

const url = `https://platform-api2.max.ru/messages?chat_id=${encodeURIComponent(chatId)}`
const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ text })
})
const body = await res.text()
if (!res.ok) {
  console.error(res.status, body)
  process.exit(1)
}
console.log(body)
