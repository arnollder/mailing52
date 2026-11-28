/**
 * Ежедневный дайджест расписания М52.
 * Данные: na-russia.org (+ online-группы с аннн.рф).
 * Ссылки в посте: https://аннн.рф/groups/{slug}
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const CACHE_DIR = resolve(ROOT, 'data')
const CACHE_JSON = resolve(CACHE_DIR, 'schedule-cache.json')
const STATUS_JSON = resolve(CACHE_DIR, 'schedule-status.json')

const NA_GROUPS = 'https://na-russia.org/api/groups/?limit=200'
const ANNN_ORIGIN = 'https://xn--80a0aaa.xn--p1ai' // аннн.рф
const ANNN_PUBLIC = 'https://аннн.рф'
const DAY_NAMES = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

const DEFAULT_LOCALITY = 45
/** Online-группы только на аннн.рф (в na-russia locality 45 их нет). */
const ANNN_ONLINE_SLUGS = ['utro-online', 'istok-online']
/** na-russia meeting.types: 9 = рабочее собрание — в дайджест не берём. */
const MEETING_TYPE_WORKING = 9

let lastStatus = loadJson(STATUS_JSON, null)

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

function localityId() {
  return Number(process.env.NA_RUSSIA_LOCALITY_ID || DEFAULT_LOCALITY)
}

function uaHeaders() {
  return { 'User-Agent': 'mailing52-schedule/1.0 (+https://arnolder.ru)' }
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: uaHeaders(), signal: AbortSignal.timeout(45_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res.json()
}

async function fetchText(url) {
  const res = await fetch(url, { headers: uaHeaders(), signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res.text()
}

function stripHtml(s) {
  return String(s || '')
    .replace(/<br\s*\/?>/gi, ', ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, '')
}

/** Сейчас в Europe/Moscow: { weekday:1-7, ymd, hour, minute } */
export function moscowNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false
  }).formatToParts(date)
  const get = (t) => parts.find(p => p.type === t)?.value
  const wdMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }
  return {
    weekday: wdMap[get('weekday')] || 1,
    ymd: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    dayName: DAY_NAMES[wdMap[get('weekday')] || 1]
  }
}

async function fetchAllNaGroups() {
  const out = []
  let url = NA_GROUPS
  while (url) {
    const page = await fetchJson(url)
    if (Array.isArray(page?.results)) out.push(...page.results)
    url = page?.next || null
  }
  return out
}

async function fetchAnnnCatalog() {
  const html = await fetchText(`${ANNN_ORIGIN}/`)
  /** @type {Map<string, string>} slug -> title */
  const bySlug = new Map()
  for (const m of html.matchAll(/href="(?:https:\/\/[^"]+)?\/groups\/([a-z0-9\-]+)"[^>]*>([^<]{1,100})<\/a>/gi)) {
    const slug = m[1]
    const title = stripHtml(m[2])
    if (!title || /подробнее|читать/i.test(title)) continue
    if (!bySlug.has(slug) || title.length > (bySlug.get(slug) || '').length) {
      bySlug.set(slug, title)
    }
  }
  return bySlug
}

/** Стилизованные имена на аннн.рф → slug (если API даёт «Южная», а сайт — «ЮжNAя»). */
const NAME_SLUG_ALIASES = new Map([
  [normalizeName('Южная'), 'yuzhnaya'],
  [normalizeName('ЮжNAя'), 'yuzhnaya'],
  [normalizeName('NовAя'), 'novaya'],
  [normalizeName('Новая'), 'novaya'],
  [normalizeName('Сегодня ночью'), 'segodnya-nochyu'],
  [normalizeName('Сегодня Нoчью'), 'segodnya-nochyu'],
  [normalizeName('NA Берегу (Заволжье)'), 'na-beregu-zavolzhe'],
  [normalizeName('NA берегу (Заволжье)'), 'na-beregu-zavolzhe'],
  [normalizeName('АНтей'), 'antey'],
  [normalizeName('Белый день'), 'belyy-den'],
  [normalizeName('Двенашка'), 'dvenashka'],
  [normalizeName('Исток'), 'istok'],
  [normalizeName('Исток Midnight'), 'istok-midnight'],
  [normalizeName('Куба'), 'kuba'],
  [normalizeName('Метеор'), 'meteor'],
  [normalizeName('Надежда (Кстово)'), 'nadezhda'],
  [normalizeName('Old School'), 'old-school'],
  [normalizeName('Сегодня'), 'today'],
  [normalizeName('Выбор'), 'vybor'],
  [normalizeName('Феникс (Дзержинск)'), 'feniks-dzerzhinsk'],
  [normalizeName('Парус (Выкса)'), 'parus-vyksa'],
  [normalizeName('Шанс (Балахна)'), 'shans-balahna'],
  [normalizeName('КаНАтка (Бор)'), 'kanatka-bor'],
  [normalizeName('Возрождение (Городец)'), 'vozrozhdenie-gorodec'],
  [normalizeName('Искра (Арзамас)'), 'iskra-arzamas'],
  [normalizeName('Чистые (Саров)'), 'chistye-sarov'],
  [normalizeName('НАчало (Муром)'), 'nachalo-murom']
])

/** Только точное совпадение / алиас (без «Утро»→«Утро Online»). */
function matchSlug(groupName, catalog) {
  const want = normalizeName(groupName)
  if (!want) return null
  const aliased = NAME_SLUG_ALIASES.get(want)
  if (aliased && catalog.has(aliased)) return aliased
  for (const [slug, title] of catalog) {
    if (normalizeName(title) === want) return slug
  }
  return null
}

const NN_ADDR_RE = /нижн\w*\s+новгород|арзамас|дзержинск|кстов|заволж|балахн|выкс|городец|саров|муром|бор\b|кулебак/i

function pickGroupForTitle(title, groups, locId) {
  const want = normalizeName(title)
  if (!want) return null
  const exact = groups.filter(g => g.active && normalizeName(g.name) === want)
  if (!exact.length) return null
  const local = exact.find(g => g.locality === locId)
  if (local) return local
  const byAddr = exact.find(g => NN_ADDR_RE.test(String(g.location?.address || '')))
  if (byAddr) return byAddr
  // не берём случайный тёску из другого региона
  return null
}

function meetingOnWeekday(meeting, weekday) {
  for (const rec of meeting.recurrences || []) {
    if (rec.exclude) continue
    // na-russia: 1–7 Пн–Вс; на всякий — 0=Вс
    const days = (rec.days_of_week || []).map((d) => (d === 0 ? 7 : d))
    if (days.includes(weekday)) return true
  }
  return false
}

function formatTime(t) {
  const m = String(t || '').match(/^(\d{1,2}):(\d{2})/)
  if (!m) return String(t || '').slice(0, 5)
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

function placeForGroup(group) {
  const loc = group.location || {}
  const place = stripHtml(loc.place_description || '')
  const add = stripHtml(loc.address_additional_info || '')
  const addr = stripHtml(loc.address || '')
  // place_description часто полнее (этаж/офис)
  const parts = []
  if (addr) parts.push(addr)
  if (add && !addr.includes(add)) parts.push(add)
  if (place && place.length > 3 && !addr.includes(place.slice(0, 20))) {
    // не дублируем весь HTML-хвост, если это длинная инструкция — берём короткое
    if (place.length <= 120) parts.push(place)
    else if (!addr) parts.push(place.slice(0, 120))
  }
  return parts.join(', ') || 'см. страницу группы'
}

function zoomFromLinks(links) {
  for (const item of links || []) {
    const s = typeof item === 'string' ? item : (item?.url || item?.link || '')
    if (/zoom\.us/i.test(s)) return s.trim()
  }
  return ''
}

function pushDayTime(byDay, day, time) {
  const t = formatTime(String(time).replace('.', ':'))
  if (!/^\d{2}:\d{2}$/.test(t)) return
  const arr = byDay.get(day) || []
  if (!arr.includes(t)) arr.push(t)
  byDay.set(day, arr)
}

/** Парсинг страницы группы на аннн.рф (расписание + адрес + zoom). */
async function enrichFromAnnn(slug) {
  const html = await fetchText(`${ANNN_ORIGIN}/groups/${slug}`)
  const titleMeta = html.match(/property="og:title"\s+content="([^"]+)"/i)
  const descMeta = html.match(/property="og:description"\s+content="([^"]+)"/i)
  const title = titleMeta ? stripHtml(titleMeta[1]) : slug
  const desc = descMeta ? stripHtml(descMeta[1]) : ''
  const zooms = [...html.matchAll(/https?:\/\/(?:[\w.-]+\.)?zoom\.us\/[^\s"'<>]+/gi)].map(m => m[0])
  const zoom = zooms[0] || ''
  const addrField = html.match(/field-name-field-adres[\s\S]*?field-item[^>]*>([\s\S]*?)<\/div>/i)
  let addrHint = addrField ? stripHtml(addrField[1]) : ''
  if (!addrHint) {
    const m = html.match(/Адрес:\s*<\/[^>]+>\s*<[^>]+>([\s\S]*?)<\//i)
    if (m) addrHint = stripHtml(m[1])
  }

  /** @type {Map<number, string[]>} */
  const byDay = new Map()
  const ranges = [
    { re: /понедельник\s*[-–—]\s*пятниц[а-я]*\s*[:\-–—]?\s*(\d{1,2})[.:](\d{2})/iu, days: [1, 2, 3, 4, 5] },
    { re: /суббот[а-я]*\s*,?\s*воскресен[а-я]*\s*[:\-–—]?\s*(\d{1,2})[.:](\d{2})/iu, days: [6, 7] },
    { re: /воскресен[а-я]*\s*[:\-–—]\s*(\d{1,2})[.:](\d{2})/iu, days: [7] },
    { re: /суббот[а-я]*\s*[:\-–—]\s*(\d{1,2})[.:](\d{2})/iu, days: [6] },
    { re: /вторник\s*[:\-–—]\s*(\d{1,2})[.:](\d{2})/iu, days: [2] },
    { re: /понедельник\s*[:\-–—]\s*(\d{1,2})[.:](\d{2})/iu, days: [1] },
    { re: /сред[ауы]\s*[:\-–—]\s*(\d{1,2})[.:](\d{2})/iu, days: [3] },
    { re: /четверг\s*[:\-–—]\s*(\d{1,2})[.:](\d{2})/iu, days: [4] },
    { re: /пятниц[ауы]\s*[:\-–—]\s*(\d{1,2})[.:](\d{2})/iu, days: [5] }
  ]
  // Не тащим время из фраз про «рабочее собрание» в обычный дайджест
  const blob = `${desc}\n${stripHtml(html)}`.replace(/рабочее\s+собрание[\s\S]{0,160}/gi, ' ')
  for (const { re, days } of ranges) {
    for (const m of blob.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`))) {
      const t = `${m[1].padStart(2, '0')}:${m[2]}`
      for (const d of days) pushDayTime(byDay, d, t)
    }
  }

  // Drupal-виджет: <div class="str"><div class="1 left">19:30</div>… class 1=Пн…6=Сб, 0=Вс
  for (const m of html.matchAll(/class="([0-6])\s+left"[^>]*>\s*([^<]*?)\s*</gi)) {
    const idx = Number(m[1])
    const day = idx === 0 ? 7 : idx
    const cell = stripHtml(m[2])
    if (/^\d{1,2}:\d{2}$/.test(cell)) pushDayTime(byDay, day, cell)
  }

  return { slug, title, zoom, addrHint, byDay, online: /online/i.test(slug) || Boolean(zoom) }
}

/**
 * Собрать строки дайджеста на weekday (1=Пн…7=Вс).
 */
export async function buildDigest({ weekday = moscowNow().weekday, useCacheOnFail = true } = {}) {
  const locId = localityId()
  try {
    const [groups, catalog] = await Promise.all([
      fetchAllNaGroups(),
      fetchAnnnCatalog()
    ])

    // 1) Все группы locality М52
    // 2) Плюс группы с аннн.рф, если в na-russia есть тёзка в М52/нижегородском адресе
    const selected = []
    const seenGroupIds = new Set()

    for (const g of groups) {
      if (!g.active || g.locality !== locId) continue
      // ссылка на аннн.рф только если slug реально есть в каталоге (иначе 404)
      const slug = matchSlug(g.name, catalog) || (g.slug && catalog.has(g.slug) ? g.slug : null)
      selected.push({
        group: g,
        slug,
        title: (slug && catalog.get(slug)) || g.name
      })
      seenGroupIds.add(g.id)
    }

    for (const [slug, title] of catalog) {
      if (ANNN_ONLINE_SLUGS.includes(slug)) continue
      const g = pickGroupForTitle(title, groups, locId)
      if (!g || seenGroupIds.has(g.id)) continue
      selected.push({ group: g, slug, title })
      seenGroupIds.add(g.id)
    }

    const unique = selected

    /** @type {{ time: string, name: string, url: string, place: string, sortName: string }[]} */
    const rows = []

    for (const { group, slug, title } of unique) {
      const url = slug ? `${ANNN_PUBLIC}/groups/${slug}` : ANNN_PUBLIC
      const name = title || (slug && catalog.get(slug)) || group.name
      for (const meeting of group.meetings || []) {
        if ((meeting.types || []).includes(MEETING_TYPE_WORKING)) continue
        if (!meetingOnWeekday(meeting, weekday)) continue
        const time = formatTime(meeting.time)
        let place = placeForGroup(group)
        if (meeting.online) {
          const z = zoomFromLinks(meeting.online_links) || zoomFromLinks(group.online_links)
          place = z
            ? `Пройти в комнату zoom по ссылке (${z})`
            : (stripHtml(meeting.online_description || group.online_description) || 'Пройти в комнату zoom по ссылке')
        }
        rows.push({ time, name, url, place, sortName: name })
      }
    }

    // Только whitelist: online + известные slug М52 (не весь каталог аннн.рф)
    const enrichAllow = new Set([...ANNN_ONLINE_SLUGS, ...NAME_SLUG_ALIASES.values()])
    const coveredSlugs = new Set(unique.map(u => u.slug).filter(Boolean))
    for (const [slug, catalogTitle] of catalog) {
      if (coveredSlugs.has(slug)) continue
      if (!enrichAllow.has(slug)) continue
      try {
        const page = await enrichFromAnnn(slug)
        const times = page.byDay.get(weekday) || []
        if (!times.length) continue
        const title = catalogTitle || page.title
        for (const time of times) {
          let place = page.addrHint || 'см. страницу группы'
          if (page.online || page.zoom) {
            place = page.zoom
              ? `Пройти в комнату zoom по ссылке (${page.zoom})`
              : (page.addrHint || 'Пройти в комнату zoom по ссылке')
          }
          rows.push({
            time,
            name: title,
            url: `${ANNN_PUBLIC}/groups/${slug}`,
            place,
            sortName: title
          })
        }
      } catch (err) {
        console.warn('[schedule] annn enrich', slug, err instanceof Error ? err.message : err)
      }
    }

    // dedupe time+name
    const rowKeys = new Set()
    const deduped = []
    for (const r of rows) {
      const k = `${r.time}|${normalizeName(r.name)}`
      if (rowKeys.has(k)) continue
      rowKeys.add(k)
      deduped.push(r)
    }
    deduped.sort((a, b) => a.time.localeCompare(b.time) || a.sortName.localeCompare(b.sortName, 'ru'))

    const dayName = DAY_NAMES[weekday] || ''
    const lines = [
      '🔷Расписание собраний🔷',
      '',
      dayName,
      ''
    ]
    deduped.forEach((r, i) => {
      lines.push(`${r.time} - ${r.name} (${r.url}) - ${r.place}`)
      if (i < deduped.length - 1) lines.push('')
    })
    lines.push('')
    lines.push('* группа, собрание со звездочкой: смотрите на странице группы')
    const text = lines.join('\n')

    const payload = {
      ok: true,
      source: 'live',
      weekday,
      dayName,
      builtAt: new Date().toISOString(),
      moscowYmd: moscowNow().ymd,
      count: deduped.length,
      groupsUsed: unique.length,
      catalogSize: catalog.size,
      text,
      rows: deduped
    }
    saveJson(CACHE_JSON, payload)
    return payload
  } catch (err) {
    if (useCacheOnFail) {
      const cached = loadJson(CACHE_JSON, null)
      if (cached?.text) {
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

export function scheduleDryRunEnabled() {
  return process.env.SCHEDULE_DRY_RUN === '1'
}

export function getScheduleStatus() {
  const base = lastStatus || loadJson(STATUS_JSON, {
    lastRunAt: null,
    lastTrigger: null,
    lastOk: null,
    allOk: null,
    results: null,
    error: null,
    dryRun: null,
    previewChars: null
  })
  // старые записи: lastOk = anyOk → пересчёт по results
  let allOk = base.allOk
  let lastOk = base.lastOk
  if (base.results && typeof base.results === 'object') {
    const vals = Object.values(base.results)
    if (vals.length) {
      const computed = vals.every(r => r && r.ok)
      if (allOk == null) allOk = computed
      if (lastOk === true && !computed) lastOk = false
    }
  }
  return { ...base, allOk, lastOk, dryRunEnv: scheduleDryRunEnabled() }
}

function setStatus(patch) {
  lastStatus = { ...getScheduleStatus(), ...patch }
  saveJson(STATUS_JSON, lastStatus)
  return lastStatus
}

/**
 * @param {{ sendFn: (text: string, channels: string[]) => Promise<Record<string, {ok?: boolean, error?: string}>>, channels?: string[], trigger?: 'cron'|'manual', dryRun?: boolean }} opts
 */
export async function sendScheduleDigest(opts) {
  const {
    sendFn,
    channels = ['telegram', 'max', 'whatsapp'],
    trigger = 'manual',
    dryRun = scheduleDryRunEnabled()
  } = opts

  const digest = await buildDigest({ weekday: moscowNow().weekday })
  if (!digest.text || digest.count === 0) {
    const status = setStatus({
      lastRunAt: new Date().toISOString(),
      lastTrigger: trigger,
      lastOk: false,
      allOk: false,
      error: 'пустой дайджест',
      results: null,
      dryRun,
      previewChars: digest.text?.length || 0,
      dayName: digest.dayName
    })
    return { ok: false, allOk: false, error: 'пустой дайджест', digest, status }
  }

  if (dryRun) {
    const status = setStatus({
      lastRunAt: new Date().toISOString(),
      lastTrigger: trigger,
      lastOk: true,
      allOk: true,
      error: null,
      results: Object.fromEntries(channels.map(c => [c, { ok: true, dryRun: true }])),
      dryRun: true,
      previewChars: digest.text.length,
      dayName: digest.dayName,
      source: digest.source
    })
    return { ok: true, allOk: true, dryRun: true, digest, results: status.results, status }
  }

  const results = await sendFn(digest.text, channels)
  const anyOk = Object.values(results).some(r => r && r.ok)
  const allOk = channels.every(c => results[c]?.ok)
  const status = setStatus({
    lastRunAt: new Date().toISOString(),
    lastTrigger: trigger,
    lastOk: allOk,
    allOk,
    error: allOk ? null : (anyOk ? 'частично: не все каналы' : 'ни один канал не принял'),
    results,
    dryRun: false,
    previewChars: digest.text.length,
    dayName: digest.dayName,
    source: digest.source
  })
  return { ok: anyOk, allOk, digest, results, status }
}

/** Крон 06:00 Europe/Moscow, раз в сутки. */
export function startScheduleCron(run) {
  if (process.env.SCHEDULE_CRON_DISABLE === '1') {
    console.log('[schedule] cron disabled')
    return
  }
  const hour = Number(process.env.SCHEDULE_CRON_HOUR || 6)
  const minute = Number(process.env.SCHEDULE_CRON_MINUTE || 0)
  let lastFiredYmd = ''
  console.log(`[schedule] cron ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} Europe/Moscow`)
  setInterval(() => {
    const now = moscowNow()
    if (now.hour !== hour || now.minute !== minute) return
    if (lastFiredYmd === now.ymd) return
    lastFiredYmd = now.ymd
    Promise.resolve()
      .then(() => run('cron'))
      .catch((err) => {
        console.warn('[schedule] cron failed', err instanceof Error ? err.message : err)
        setStatus({
          lastRunAt: new Date().toISOString(),
          lastTrigger: 'cron',
          lastOk: false,
          allOk: false,
          error: err instanceof Error ? err.message : String(err)
        })
      })
  }, 15_000)
}
