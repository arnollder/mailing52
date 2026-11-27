<script setup lang="ts">
import { ref } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import PageShell from '@/components/PageShell.vue'
import { useApiKey } from '@/composables/useApiKey'
import {
  statusClass,
  statusLabel,
  useChannels
} from '@/composables/useChannels'
import { useToast } from '@/composables/useToast'

const { channels, loading, error, onlineCount, refresh } = useChannels()
const { apiKey, hasKey, setApiKey, qrUrl } = useApiKey()
const toast = useToast()
const keyDraft = ref(apiKey.value)

function saveKey() {
  const next = keyDraft.value.trim()
  setApiKey(next)
  toast.add({
    title: next ? 'API-ключ сохранён' : 'Ключ очищен',
    description: 'Только в этом браузере (localStorage)',
    tone: 'success'
  })
}

function openQr(e: Event) {
  if (hasKey.value) return
  e.preventDefault()
  toast.add({ title: 'Сначала сохрани API-ключ', tone: 'warning' })
}
</script>

<template>
  <PageShell title="Каналы">
    <div class="desk-page-enter mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-6 p-4 sm:p-6">
      <div class="desk-surface-soft flex flex-wrap items-start justify-between gap-3 rounded-2xl px-5 py-4">
        <div>
          <p class="text-sm font-medium">
            Одна рассылка на всю местность М52
          </p>
          <p class="mt-1 text-sm leading-relaxed text-[var(--desk-muted)]">
            Три канала — по одному общему чату. Статусы с API, секреты только в `.env` на сервере.
          </p>
          <p class="mt-2 text-xs text-[var(--desk-muted)]">
            Онлайн: <span class="text-moss-400">{{ onlineCount }}</span> / {{ channels.length || 3 }}
            <span v-if="loading"> · обновляю…</span>
          </p>
          <p
            v-if="error"
            class="mt-2 text-xs text-ember-400"
          >
            API: {{ error }}
          </p>
        </div>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          :disabled="loading"
          @click="refresh"
        >
          <RefreshCw
            class="size-3.5"
            :class="loading ? 'animate-spin' : ''"
          />
          Обновить
        </button>
      </div>

      <div class="desk-surface rounded-2xl p-4 sm:p-5">
        <h2 class="font-display mb-1 text-sm font-semibold">
          API-ключ оператора
        </h2>
        <p class="mb-3 text-xs text-[var(--desk-muted)]">
          Значение `MAILING52_API_KEY` из `.env`. Нужен для срочных и QR WhatsApp.
          {{ hasKey ? 'Ключ в этом браузере есть.' : 'Ключа ещё нет — срочное не уйдёт.' }}
        </p>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            v-model="keyDraft"
            class="input flex-1 font-mono text-sm"
            type="password"
            autocomplete="off"
            spellcheck="false"
            placeholder="вставь ключ"
          >
          <button
            type="button"
            class="btn btn-primary btn-sm"
            @click="saveKey"
          >
            Сохранить
          </button>
        </div>
      </div>

      <div class="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="ch in channels"
          :key="ch.id"
          class="desk-surface flex min-w-0 max-w-full flex-col gap-3 overflow-hidden rounded-2xl p-4"
        >
          <div class="flex min-w-0 items-start gap-2.5">
            <span class="grid size-9 shrink-0 place-items-center rounded-xl bg-moss-500/12 text-xs font-bold text-moss-400 ring-1 ring-moss-400/25">
              {{ ch.short }}
            </span>
            <div class="min-w-0 flex-1 overflow-hidden">
              <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                <h3 class="text-sm font-semibold">
                  {{ ch.name }}
                </h3>
                <span
                  class="text-[11px]"
                  :class="statusClass(ch.status)"
                >
                  {{ statusLabel(ch.status) }}
                </span>
              </div>
              <p class="mt-0.5 truncate text-[11px] text-[var(--desk-muted)]">
                {{ ch.title }}
              </p>
              <p class="truncate text-[11px] text-[var(--desk-muted)]">
                {{ ch.hint }}
              </p>
            </div>
          </div>

          <dl class="grid min-w-0 gap-2 text-xs">
            <div
              v-if="ch.chatId"
              class="min-w-0 overflow-hidden rounded-xl bg-[var(--desk-elevated)]/80 px-3 py-2 ring-1 ring-[var(--desk-line)]"
            >
              <dt class="text-[10px] uppercase tracking-wide text-[var(--desk-muted)]">
                chat / group id
              </dt>
              <dd class="mt-0.5 break-all font-mono text-[11px] [overflow-wrap:anywhere]">
                {{ ch.chatId }}
              </dd>
            </div>
            <div
              v-if="ch.botUsername"
              class="min-w-0 overflow-hidden rounded-xl bg-[var(--desk-elevated)]/80 px-3 py-2 ring-1 ring-[var(--desk-line)]"
            >
              <dt class="text-[10px] uppercase tracking-wide text-[var(--desk-muted)]">
                бот
              </dt>
              <dd class="mt-0.5 truncate">
                @{{ ch.botUsername }}
              </dd>
            </div>
            <div
              v-if="ch.link"
              class="min-w-0 overflow-hidden rounded-xl bg-[var(--desk-elevated)]/80 px-3 py-2 ring-1 ring-[var(--desk-line)]"
            >
              <dt class="text-[10px] uppercase tracking-wide text-[var(--desk-muted)]">
                ссылка
              </dt>
              <dd class="mt-0.5 min-w-0">
                <a
                  :href="ch.link"
                  class="block break-all text-moss-400 [overflow-wrap:anywhere] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ ch.link }}
                </a>
              </dd>
            </div>
            <div
              v-if="ch.id !== 'whatsapp'"
              class="min-w-0 overflow-hidden rounded-xl bg-[var(--desk-elevated)]/80 px-3 py-2 ring-1 ring-[var(--desk-line)]"
            >
              <dt class="text-[10px] uppercase tracking-wide text-[var(--desk-muted)]">
                токен в .env
              </dt>
              <dd class="mt-0.5">
                {{ ch.hasToken ? 'есть' : 'нет' }}
              </dd>
            </div>
            <div
              v-if="ch.detail"
              class="min-w-0 break-all overflow-hidden rounded-xl bg-ember-500/10 px-3 py-2 text-ember-300 ring-1 ring-ember-500/25 [overflow-wrap:anywhere]"
            >
              {{ ch.detail }}
            </div>
          </dl>

          <a
            v-if="ch.id === 'whatsapp' && ch.status !== 'connected'"
            :href="qrUrl()"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-primary btn-sm btn-block"
            :class="!hasKey ? 'opacity-50' : ''"
            @click="openQr"
          >
            Открыть QR WhatsApp
          </a>
        </article>
      </div>

      <p
        v-if="!loading && !channels.length && !error"
        class="text-sm text-[var(--desk-muted)]"
      >
        Каналов пока нет в ответе API.
      </p>

      <section>
        <h2 class="font-display mb-3 text-sm font-semibold">
          Что нужно для подключения
        </h2>
        <div class="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="ch in channels"
            :key="`need-${ch.id}`"
            class="desk-surface min-w-0 overflow-hidden rounded-2xl p-4"
          >
            <h3 class="mb-2 text-sm font-semibold text-moss-400">
              {{ ch.name }}
            </h3>
            <ul class="flex flex-col gap-1.5">
              <li
                v-for="item in ch.needs"
                :key="item"
                class="flex gap-2 text-xs text-[var(--desk-muted)]"
              >
                <span class="mt-0.5 text-moss-400">·</span>
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  </PageShell>
</template>
