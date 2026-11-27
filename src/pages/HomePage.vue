<script setup lang="ts">
import { computed } from 'vue'
import { CalendarPlus, Megaphone, Radio, Upload } from 'lucide-vue-next'
import PageShell from '@/components/PageShell.vue'
import { statusClass, statusLabel, useChannels } from '@/composables/useChannels'
import { channelMeta, flyers, groups, urgentHistory } from '@/data/mock'

const upcoming = flyers
  .filter(f => f.status !== 'sent')
  .slice(0, 3)
  .map(f => ({ title: f.title, when: f.date, place: f.place }))

const flyerInWork = flyers.filter(f => f.status !== 'sent').length
const { channels, onlineCount } = useChannels()
const channelTotal = computed(() => channels.value.length || 3)
</script>

<template>
  <PageShell title="Обзор">
    <template #actions>
      <div class="hidden items-center gap-3 text-xs text-[var(--desk-muted)] sm:flex">
        <span class="inline-flex items-center gap-1.5">
          <span class="size-1.5 rounded-full bg-moss-500 channel-dot-online" />
          {{ onlineCount }}/{{ channelTotal }}
        </span>
        <span>·</span>
        <span>{{ groups.length }} групп</span>
        <span>·</span>
        <span>{{ flyerInWork }} флаера</span>
      </div>
      <RouterLink
        to="/urgent"
        class="btn btn-danger btn-sm"
      >
        <Megaphone class="size-3.5" />
        Срочное
      </RouterLink>
    </template>

    <div class="desk-page-enter mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-6">
      <header class="desk-surface-soft px-5 py-6 sm:px-7 sm:py-7">
        <p class="mb-2 text-[11px] uppercase tracking-[0.18em] text-moss-400">
          Комитет Digital · М52
        </p>
        <h2 class="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Добро пожаловать за стол рассылки
        </h2>
        <p class="mt-2 max-w-xl text-sm leading-relaxed text-[var(--desk-muted)]">
          Расписание групп, флаеры и срочные — в три общих чата рассылки местности: Telegram, MAX и WhatsApp.
        </p>
        <div class="mt-5 flex flex-wrap gap-2">
          <RouterLink
            to="/schedule"
            class="btn btn-primary"
          >
            <CalendarPlus class="size-4" />
            Добавить собрание
          </RouterLink>
          <RouterLink
            to="/flyers"
            class="btn btn-outline"
          >
            <Upload class="size-4" />
            Загрузить флаер
          </RouterLink>
          <RouterLink
            to="/channels"
            class="btn btn-ghost"
          >
            <Radio class="size-4" />
            Каналы
          </RouterLink>
        </div>
      </header>

      <div class="grid gap-5 lg:grid-cols-2">
        <section class="desk-surface p-4 sm:p-5">
          <div class="mb-3 flex items-baseline justify-between">
            <h3 class="font-display text-base font-semibold">
              Ближайшие события
            </h3>
            <RouterLink
              to="/flyers"
              class="text-xs text-moss-400 hover:underline"
            >
              Флаеры
            </RouterLink>
          </div>
          <ul class="flex flex-col gap-2">
            <li
              v-for="item in upcoming"
              :key="item.title"
              class="flex gap-3 rounded-xl bg-[var(--desk-elevated)]/80 px-3.5 py-3 ring-1 ring-[var(--desk-line)]"
            >
              <span class="mt-1.5 size-2 shrink-0 rounded-full bg-moss-500/80" />
              <div class="min-w-0">
                <p class="text-sm font-medium">
                  {{ item.title }}
                </p>
                <p class="mt-0.5 text-xs text-[var(--desk-muted)]">
                  {{ item.when }} · {{ item.place }}
                </p>
              </div>
            </li>
          </ul>
        </section>

        <section class="flex flex-col gap-4">
          <div class="desk-surface p-4 sm:p-5">
            <div class="mb-3 flex items-baseline justify-between">
              <h3 class="font-display text-base font-semibold">
                Каналы
              </h3>
              <RouterLink
                to="/channels"
                class="text-xs text-moss-400 hover:underline"
              >
                Настроить
              </RouterLink>
            </div>
            <ul class="flex flex-col gap-2">
              <li
                v-for="ch in channels"
                :key="ch.id"
                class="flex items-center gap-3 rounded-xl bg-[var(--desk-elevated)]/80 px-3.5 py-2.5 ring-1 ring-[var(--desk-line)]"
              >
                <span class="grid size-7 place-items-center rounded-lg bg-moss-500/12 text-[10px] font-bold text-moss-400">
                  {{ ch.short }}
                </span>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium">
                    {{ ch.name }}
                  </p>
                  <p class="truncate text-[11px] text-[var(--desk-muted)]">
                    {{ ch.hint }}
                  </p>
                </div>
                <span
                  class="text-[11px]"
                  :class="statusClass(ch.status)"
                >
                  {{ statusLabel(ch.status) }}
                </span>
              </li>
            </ul>
          </div>

          <div
            v-if="urgentHistory[0]"
            class="rounded-2xl border border-ember-500/30 bg-ember-500/10 px-4 py-3.5"
          >
            <div class="mb-1.5 flex items-center gap-2">
              <Megaphone class="size-3.5 text-ember-400" />
              <span class="text-[11px] font-semibold uppercase tracking-[0.12em] text-ember-400">
                Последнее срочное
              </span>
              <span class="ms-auto text-[11px] text-[var(--desk-muted)]">
                {{ urgentHistory[0].createdAt }}
              </span>
            </div>
            <p class="text-sm leading-snug">
              {{ urgentHistory[0].text }}
            </p>
            <div class="mt-2.5 flex flex-wrap gap-1">
              <span
                v-for="c in urgentHistory[0].channels"
                :key="c"
                class="badge"
              >
                {{ channelMeta[c].label }}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  </PageShell>
</template>
