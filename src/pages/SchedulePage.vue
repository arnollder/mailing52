<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Megaphone, RefreshCw } from 'lucide-vue-next'
import PageShell from '@/components/PageShell.vue'
import { useToast } from '@/composables/useToast'
import { channelMeta, type Channel } from '@/data/mock'

const toast = useToast()

const loading = ref(false)
const sending = ref(false)
const text = ref('')
const dayName = ref('')
const count = ref(0)
const source = ref('')
const warning = ref('')
const error = ref('')
const status = ref<{
  lastRunAt?: string | null
  lastTrigger?: string | null
  lastOk?: boolean | null
  allOk?: boolean | null
  error?: string | null
  dryRun?: boolean | null
  dryRunEnv?: boolean | null
  results?: Record<string, { ok?: boolean, error?: string, dryRun?: boolean }> | null
  dayName?: string | null
  source?: string | null
} | null>(null)

const channels = ref<Channel[]>(['telegram', 'max', 'whatsapp'])
const allChannels: Channel[] = ['telegram', 'max', 'whatsapp']

const dryRunActive = computed(() => Boolean(status.value?.dryRunEnv || status.value?.dryRun))

const statusLine = computed(() => {
  const s = status.value
  if (!s?.lastRunAt) return 'Ещё не отправляли'
  const when = new Date(s.lastRunAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
  const trig = s.lastTrigger === 'cron' ? 'авто' : 'вручную'
  const results = s.results ? Object.values(s.results) : []
  const allOk = s.allOk === true || (s.allOk == null && s.lastOk === true)
  const anyOk = results.length ? results.some(r => r?.ok) : Boolean(s.lastOk)
  const verdict = allOk ? 'ok' : anyOk ? 'частично' : 'fail'
  const dry = s.dryRun ? ' · dry-run' : ''
  const ch = s.results
    ? ' · ' + Object.entries(s.results)
      .map(([k, v]) => `${channelMeta[k as Channel]?.label || k}:${v?.ok ? 'ok' : 'fail'}`)
      .join(' ')
    : ''
  return `${when} · ${trig} · ${verdict}${dry}${ch}`
})

function toggleChannel(c: Channel) {
  const i = channels.value.indexOf(c)
  if (i >= 0) channels.value.splice(i, 1)
  else channels.value.push(c)
}

async function loadPreview() {
  loading.value = true
  error.value = ''
  warning.value = ''
  try {
    const res = await fetch('/api/schedule/preview')
    const data = await res.json().catch(() => ({})) as {
      ok?: boolean
      text?: string
      dayName?: string
      count?: number
      source?: string
      warning?: string
      error?: string
      status?: typeof status.value
    }
    if (!res.ok || !data.ok) {
      error.value = data.error || `HTTP ${res.status}`
      return
    }
    text.value = data.text || ''
    dayName.value = data.dayName || ''
    count.value = data.count || 0
    source.value = data.source || ''
    warning.value = data.warning || ''
    status.value = data.status || status.value
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'сеть'
  } finally {
    loading.value = false
  }
}

async function loadStatus() {
  try {
    const res = await fetch('/api/schedule/status')
    const data = await res.json().catch(() => ({})) as { ok?: boolean, status?: typeof status.value }
    if (res.ok && data.ok) status.value = data.status || null
  } catch { /* ignore */ }
}

async function sendNow() {
  if (!channels.value.length) {
    toast.add({ title: 'Выбери канал', tone: 'warning' })
    return
  }
  sending.value = true
  try {
    const res = await fetch('/api/schedule/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channels: channels.value, trigger: 'manual' })
    })
    const data = await res.json().catch(() => ({})) as {
      ok?: boolean
      allOk?: boolean
      error?: string
      dryRun?: boolean
      digest?: { text?: string, count?: number, dayName?: string, source?: string }
      results?: Record<string, { ok?: boolean, error?: string }>
      status?: typeof status.value
    }
    if (data.digest?.text) {
      text.value = data.digest.text
      count.value = data.digest.count || 0
      dayName.value = data.digest.dayName || dayName.value
      source.value = data.digest.source || source.value
    }
    if (data.status) status.value = data.status

    if (!res.ok || !data.ok) {
      const parts = Object.entries(data.results || {})
        .map(([k, v]) => `${channelMeta[k as Channel]?.label || k}: ${v.ok ? 'ok' : (v.error || 'fail')}`)
      toast.add({
        title: 'Не ушло',
        description: parts.join(' · ') || data.error || `HTTP ${res.status}`,
        tone: 'error'
      })
      return
    }
    toast.add({
      title: data.dryRun ? 'Dry-run ok' : (data.allOk ? 'Расписание ушло' : 'Ушло частично'),
      description: Object.entries(data.results || {})
        .map(([k, v]) => `${channelMeta[k as Channel]?.label || k}: ${v.ok ? 'ok' : (v.error || 'fail')}`)
        .join(' · '),
      tone: data.allOk ? 'success' : 'warning'
    })
  } catch (err) {
    toast.add({
      title: 'Сеть / API',
      description: err instanceof Error ? err.message : 'ошибка',
      tone: 'error'
    })
  } finally {
    sending.value = false
    await loadStatus()
  }
}

onMounted(() => {
  loadPreview()
  loadStatus()
})
</script>

<template>
  <PageShell title="Расписание">
    <template #actions>
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        :disabled="loading"
        @click="loadPreview"
      >
        <RefreshCw
          class="size-3.5"
          :class="loading ? 'animate-spin' : ''"
        />
        Обновить
      </button>
      <button
        type="button"
        class="btn btn-primary btn-sm"
        :disabled="sending || loading || !text"
        @click="sendNow"
      >
        <Megaphone class="size-3.5" />
        {{ sending ? 'Отправка…' : 'Отправить сейчас' }}
      </button>
    </template>

    <div class="desk-page-enter mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 sm:p-6">
      <div class="desk-surface-soft rounded-2xl px-5 py-4">
        <p
          v-if="dryRunActive"
          class="mb-3 rounded-xl bg-warning/15 px-3 py-2 text-xs font-medium text-warning ring-1 ring-warning/40"
        >
          SCHEDULE_DRY_RUN — в чаты ничего не уходит, только превью/статус.
        </p>
        <p class="text-sm font-medium">
          Дайджест на сегодня · авто в 06:00 (Москва)
        </p>
        <p class="mt-1 text-sm text-[var(--desk-muted)]">
          Источник: na-russia.org + online с аннн.рф · ссылки на аннн.рф.
          Кнопка — если автозапуск не сработал.
        </p>
        <p class="mt-2 text-xs text-[var(--desk-muted)]">
          Последний запуск: {{ statusLine }}
          <span v-if="dayName"> · день: {{ dayName }}</span>
          <span v-if="count"> · {{ count }} собраний</span>
          <span v-if="source"> · {{ source }}</span>
        </p>
        <p
          v-if="warning"
          class="mt-2 text-xs text-warning"
        >
          Кэш/предупреждение: {{ warning }}
        </p>
        <p
          v-if="error"
          class="mt-2 text-xs text-ember-400"
        >
          {{ error }}
        </p>
        <p
          v-if="status?.error && status.allOk === false"
          class="mt-2 text-xs text-ember-400"
        >
          Ошибка запуска: {{ status.error }}
        </p>
      </div>

      <div class="field">
        <span class="field-label">Куда слать</span>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="c in allChannels"
            :key="c"
            class="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ring-[var(--desk-line)]"
            :class="channels.includes(c) ? 'bg-moss-500/10' : ''"
          >
            <input
              type="checkbox"
              class="accent-moss-500"
              :checked="channels.includes(c)"
              @change="toggleChannel(c)"
            >
            {{ channelMeta[c].label }}
          </label>
        </div>
      </div>

      <div class="desk-surface rounded-2xl p-4 sm:p-5">
        <div class="mb-3 flex items-baseline justify-between gap-2">
          <h2 class="font-display text-sm font-semibold">
            Превью сообщения
          </h2>
          <span class="text-[11px] text-[var(--desk-muted)]">
            {{ text.length }} символов
          </span>
        </div>
        <pre
          class="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[var(--desk-elevated)] px-4 py-3 text-sm leading-relaxed ring-1 ring-[var(--desk-line)]"
        >{{ loading && !text ? 'Загружаю…' : text || 'Пусто' }}</pre>
      </div>
    </div>
  </PageShell>
</template>
