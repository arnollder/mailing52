<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import PageShell from '@/components/PageShell.vue'
import {
  statusClass,
  statusLabel,
  useChannels
} from '@/composables/useChannels'

const { channels, loading, error, onlineCount, refresh } = useChannels()
</script>

<template>
  <PageShell title="Каналы">
    <div class="desk-page-enter mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-6">
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

      <div class="grid gap-3 lg:grid-cols-3">
        <article
          v-for="ch in channels"
          :key="ch.id"
          class="desk-surface flex flex-col gap-3 rounded-2xl p-4"
        >
          <div class="flex items-start gap-2.5">
            <span class="grid size-9 place-items-center rounded-xl bg-moss-500/12 text-xs font-bold text-moss-400 ring-1 ring-moss-400/25">
              {{ ch.short }}
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
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
              <p class="mt-0.5 text-[11px] text-[var(--desk-muted)]">
                {{ ch.title }}
              </p>
              <p class="truncate text-[11px] text-[var(--desk-muted)]">
                {{ ch.hint }}
              </p>
            </div>
          </div>

          <dl class="grid gap-2 text-xs">
            <div
              v-if="ch.chatId"
              class="rounded-xl bg-[var(--desk-elevated)]/80 px-3 py-2 ring-1 ring-[var(--desk-line)]"
            >
              <dt class="text-[10px] uppercase tracking-wide text-[var(--desk-muted)]">
                chat / group id
              </dt>
              <dd class="mt-0.5 break-all font-mono text-[11px]">
                {{ ch.chatId }}
              </dd>
            </div>
            <div
              v-if="ch.botUsername"
              class="rounded-xl bg-[var(--desk-elevated)]/80 px-3 py-2 ring-1 ring-[var(--desk-line)]"
            >
              <dt class="text-[10px] uppercase tracking-wide text-[var(--desk-muted)]">
                бот
              </dt>
              <dd class="mt-0.5">
                @{{ ch.botUsername }}
              </dd>
            </div>
            <div
              v-if="ch.link"
              class="rounded-xl bg-[var(--desk-elevated)]/80 px-3 py-2 ring-1 ring-[var(--desk-line)]"
            >
              <dt class="text-[10px] uppercase tracking-wide text-[var(--desk-muted)]">
                ссылка
              </dt>
              <dd class="mt-0.5">
                <a
                  :href="ch.link"
                  class="text-moss-400 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ ch.link }}
                </a>
              </dd>
            </div>
            <div
              v-if="ch.id !== 'whatsapp'"
              class="rounded-xl bg-[var(--desk-elevated)]/80 px-3 py-2 ring-1 ring-[var(--desk-line)]"
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
              class="rounded-xl bg-ember-500/10 px-3 py-2 text-ember-300 ring-1 ring-ember-500/25"
            >
              {{ ch.detail }}
            </div>
          </dl>

          <a
            v-if="ch.id === 'whatsapp' && ch.status !== 'connected'"
            href="/api/wa/qr"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-primary btn-sm btn-block"
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
        <div class="grid gap-3 md:grid-cols-3">
          <div
            v-for="ch in channels"
            :key="`need-${ch.id}`"
            class="desk-surface rounded-2xl p-4"
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
