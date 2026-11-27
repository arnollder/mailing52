export type Channel = 'telegram' | 'max' | 'whatsapp'
export type EventType = 'meeting' | 'seminar' | 'anniversary' | 'other'

export interface GroupMeeting {
  id: string
  group: string
  city: string
  day: string
  time: string
  address: string
  format: string
  channels: Channel[]
}

export interface Flyer {
  id: string
  title: string
  type: EventType
  date: string
  place: string
  status: 'draft' | 'scheduled' | 'sent'
  channels: Channel[]
  preview: 'meeting' | 'seminar' | 'anniversary'
}

export interface UrgentMessage {
  id: string
  text: string
  createdAt: string
  channels: Channel[]
  status: 'sent' | 'failed' | 'queued'
  delivered: number
  total: number
}

export const groups: GroupMeeting[] = [
  {
    id: '1',
    group: 'Антей',
    city: 'Н. Новгород',
    day: 'Пн, Ср, Пт',
    time: '19:00',
    address: 'ул. Канавинская, 2а, офис 5',
    format: 'Открытое',
    channels: ['telegram', 'max', 'whatsapp']
  },
  {
    id: '2',
    group: 'Сегодня',
    city: 'Н. Новгород',
    day: 'Вт, Чт, Сб',
    time: '20:00',
    address: 'ул. Большая Печёрская, 39',
    format: 'Закрытое',
    channels: ['telegram', 'whatsapp']
  },
  {
    id: '3',
    group: 'Выбор',
    city: 'Н. Новгород',
    day: 'Пн–Пт',
    time: '20:15',
    address: 'по запросу на ИЛ',
    format: 'Открытое',
    channels: ['telegram', 'max']
  },
  {
    id: '4',
    group: 'Old School',
    city: 'Н. Новгород',
    day: 'Ср, Вс',
    time: '20:15',
    address: 'по запросу на ИЛ',
    format: 'Закрытое',
    channels: ['whatsapp']
  },
  {
    id: '5',
    group: 'Искра',
    city: 'Арзамас',
    day: 'Сб',
    time: '18:00',
    address: 'по запросу на ИЛ',
    format: 'Открытое',
    channels: ['telegram', 'max', 'whatsapp']
  },
  {
    id: '6',
    group: 'Белый день',
    city: 'Н. Новгород',
    day: 'Сб, Вс',
    time: '15:00',
    address: 'чайное собрание',
    format: 'Открытое',
    channels: ['telegram']
  }
]

export const flyers: Flyer[] = [
  {
    id: 'f1',
    title: 'Рабочее собрание Digital',
    type: 'meeting',
    date: '11 окт 2026, 15:00',
    place: 'группа «Антей»',
    status: 'scheduled',
    channels: ['telegram', 'max', 'whatsapp'],
    preview: 'meeting'
  },
  {
    id: 'f2',
    title: 'Семинар «Как нести весть через литературу»',
    type: 'seminar',
    date: '22 ноя 2026, 16:00',
    place: 'группа «Сегодня»',
    status: 'draft',
    channels: ['telegram', 'max'],
    preview: 'seminar'
  },
  {
    id: 'f3',
    title: 'Юбилей группы «Выбор» — 12 лет',
    type: 'anniversary',
    date: '5 дек 2026, 18:00',
    place: 'по анонсу',
    status: 'sent',
    channels: ['telegram', 'max', 'whatsapp'],
    preview: 'anniversary'
  }
]

export const urgentHistory: UrgentMessage[] = [
  {
    id: 'u1',
    text: 'Срочно: собрание группы «Антей» сегодня перенесено на 20:00. Адрес тот же.',
    createdAt: 'сегодня, 14:22',
    channels: ['telegram', 'max', 'whatsapp'],
    status: 'sent',
    delivered: 3,
    total: 3
  },
  {
    id: 'u2',
    text: 'ИЛ: нужна помощь на линии с 18:00 до 20:00. Пишите координатору.',
    createdAt: 'вчера, 17:05',
    channels: ['telegram', 'whatsapp'],
    status: 'sent',
    delivered: 2,
    total: 2
  }
]

export const eventTypeLabel: Record<EventType, string> = {
  meeting: 'Рабочее собрание',
  seminar: 'Семинар',
  anniversary: 'Юбилей',
  other: 'Другое'
}

export const channelMeta: Record<Channel, { label: string, short: string }> = {
  telegram: { label: 'Telegram', short: 'TG' },
  max: { label: 'MAX', short: 'MX' },
  whatsapp: { label: 'WhatsApp', short: 'WA' }
}
