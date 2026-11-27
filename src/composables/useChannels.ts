import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'

export type ChannelId = 'telegram' | 'max' | 'whatsapp'
export type ChannelStatus = 'connected' | 'pending' | 'offline'

export interface LiveChannel {
  id: ChannelId
  name: string
  short: string
  status: ChannelStatus
  title: string
  chatId: string | null
  hasToken: boolean
  link: string | null
  botUsername: string | null
  hint: string
  detail: string | null
  needs: string[]
  wa?: {
    session: string
    open: boolean
    qr: boolean
    size: number | null
  }
}

const channels: Ref<LiveChannel[]> = ref([])
const loading = ref(false)
const error = ref<string | null>(null)

let inflight: Promise<void> | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let subscribers = 0

async function fetchChannels() {
  if (inflight) return inflight
  loading.value = true
  inflight = (async () => {
    try {
      const res = await fetch('/api/channels')
      const data = await res.json().catch(() => ({})) as {
        ok?: boolean
        error?: string
        channels?: LiveChannel[]
      }
      if (!res.ok || !data.ok || !Array.isArray(data.channels)) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      channels.value = data.channels
      error.value = null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'не удалось загрузить каналы'
    } finally {
      loading.value = false
      inflight = null
    }
  })()
  return inflight
}

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(() => {
    fetchChannels().catch(() => {})
  }, 15_000)
}

function stopPolling() {
  if (subscribers > 0) return
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

export function useChannels() {
  onMounted(() => {
    subscribers += 1
    fetchChannels()
    startPolling()
  })

  onUnmounted(() => {
    subscribers = Math.max(0, subscribers - 1)
    stopPolling()
  })

  const onlineCount = computed(() =>
    channels.value.filter(c => c.status === 'connected').length
  )

  return {
    channels,
    loading,
    error,
    onlineCount,
    refresh: fetchChannels
  }
}

export function statusLabel(status: ChannelStatus) {
  if (status === 'connected') return 'подключён'
  if (status === 'pending') return 'ждёт ключ'
  return 'офлайн'
}

export function statusClass(status: ChannelStatus) {
  if (status === 'connected') return 'text-moss-400'
  if (status === 'pending') return 'text-warning'
  return 'text-[var(--desk-muted)]'
}
