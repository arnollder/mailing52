/**
 * Медитация на сегодня с na-russia.org
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderMeditationTexts } from './render.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const CACHE_JSON = resolve(ROOT, 'data', 'meditation-cache.json')

const API = 'https://na-russia.org/api/daily-meditation/'

function loadJson(path, fallback) {
  try {
    if (!existsSync(path)) return fallback
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return fallback
  }
}

function saveJson(path, data) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8')
}

function uaHeaders() {
  return { 'User-Agent': 'mailing52-schedule/1.0 (+https://arnolder.ru)' }
}

function moscowDayMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const get = (t) => parts.find(p => p.type === t)?.value
  return {
    day: Number(get('day')),
    month: Number(get('month')),
    ymd: `${get('year')}-${get('month')}-${get('day')}`
  }
}

/**
 * @param {{ day?: number, month?: number, useCacheOnFail?: boolean }} [opts]
 */
export async function buildMeditation(opts = {}) {
  const now = moscowDayMonth()
  const day = opts.day ?? now.day
  const month = opts.month ?? now.month
  const useCacheOnFail = opts.useCacheOnFail !== false

  try {
    const url = `${API}?day=${day}&month=${month}`
    const res = await fetch(url, { headers: uaHeaders(), signal: AbortSignal.timeout(30_000) })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
    const list = await res.json()
    const item = Array.isArray(list) ? list[0] : list
    if (!item?.title || !item?.body) throw new Error('пустая медитация')

    const texts = renderMeditationTexts(item)
    const payload = {
      ok: true,
      source: 'live',
      day: item.day,
      month: item.month,
      title: item.title,
      quote: item.quote || '',
      quote_from: item.quote_from || '',
      body: item.body || '',
      jft: item.jft || '',
      moscowYmd: now.ymd,
      builtAt: new Date().toISOString(),
      text: texts.plain,
      texts
    }
    saveJson(CACHE_JSON, payload)
    return payload
  } catch (err) {
    if (useCacheOnFail) {
      const cached = loadJson(CACHE_JSON, null)
      if (cached?.text && cached.day === day && cached.month === month) {
        return {
          ...cached,
          ok: true,
          source: 'cache',
          warning: err instanceof Error ? err.message : String(err)
        }
      }
    }
    throw err
  }
}
