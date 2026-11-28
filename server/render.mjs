/**
 * Рендер утренних сообщений под каналы.
 * TG/MAX — HTML; WhatsApp — *жирный* + URL отдельной строкой у имени.
 */

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** @param {{ time: string, name: string, url: string, place: string }[]} rows */
export function renderScheduleTexts({ dayName, rows }) {
  const headerPlain = ['🔷Расписание собраний🔷', '', dayName || '', '']
  const footer = ['', '* группа, собрание со звездочкой: смотрите на странице группы']

  const plainLines = [...headerPlain]
  rows.forEach((r, i) => {
    const namePart = r.url ? `${r.name} ${r.url}` : r.name
    plainLines.push(`${r.time} — ${namePart} — ${r.place}`)
    if (i < rows.length - 1) plainLines.push('')
  })
  plainLines.push(...footer)

  const htmlLines = [
    '🔷Расписание собраний🔷',
    '',
    escapeHtml(dayName || ''),
    ''
  ]
  rows.forEach((r, i) => {
    const time = `<b>${escapeHtml(r.time)}</b>`
    const name = r.url
      ? `<a href="${escapeHtml(r.url)}">${escapeHtml(r.name)}</a>`
      : escapeHtml(r.name)
    htmlLines.push(`${time} — ${name} — ${escapeHtml(r.place)}`)
    if (i < rows.length - 1) htmlLines.push('')
  })
  htmlLines.push('')
  htmlLines.push(escapeHtml('* группа, собрание со звездочкой: смотрите на странице группы'))

  const waLines = ['🔷Расписание собраний🔷', '', dayName || '', '']
  rows.forEach((r, i) => {
    if (r.url) {
      waLines.push(`*${r.time}* — ${r.name}`)
      waLines.push(r.url)
      waLines.push(r.place)
    } else {
      waLines.push(`*${r.time}* — ${r.name} — ${r.place}`)
    }
    if (i < rows.length - 1) waLines.push('')
  })
  waLines.push(...footer)

  const html = htmlLines.join('\n')
  return {
    plain: plainLines.join('\n'),
    telegram: html,
    max: html,
    whatsapp: waLines.join('\n')
  }
}

/** @param {{ day: number, month: number, title: string, quote: string, quote_from: string, body: string, jft: string }} med */
export function renderMeditationTexts(med) {
  const dm = `${String(med.day).padStart(2, '0')}.${String(med.month).padStart(2, '0')}`
  const plain = [
    '🧘 Медитация на сегодня',
    `${dm} — ${med.title}`,
    '',
    med.quote,
    med.quote_from ? `— ${med.quote_from}` : '',
    '',
    med.body,
    '',
    med.jft ? `Just for today: ${med.jft}` : ''
  ].filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n').trim()

  const html = [
    '🧘 Медитация на сегодня',
    `<b>${escapeHtml(dm)} — ${escapeHtml(med.title)}</b>`,
    '',
    escapeHtml(med.quote),
    med.quote_from ? `— ${escapeHtml(med.quote_from)}` : '',
    '',
    escapeHtml(med.body),
    '',
    med.jft ? `<b>Just for today:</b> ${escapeHtml(med.jft)}` : ''
  ].filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n').trim()

  const wa = [
    '🧘 Медитация на сегодня',
    `*${dm} — ${med.title}*`,
    '',
    med.quote,
    med.quote_from ? `— ${med.quote_from}` : '',
    '',
    med.body,
    '',
    med.jft ? `*Just for today:* ${med.jft}` : ''
  ].filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n').trim()

  return {
    plain,
    telegram: html,
    max: html,
    whatsapp: wa
  }
}
