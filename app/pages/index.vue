<script setup lang="ts">
import { channelMeta, flyers, groups, messengers, urgentHistory } from '~/utils/mock'

const upcoming = [
  { title: 'Рабочее собрание Digital', when: '11 окт · 15:00', place: 'Антей' },
  { title: 'Семинар по рассылке · Выбор', when: '28 ноя · 20:15', place: 'Выбор' },
  { title: 'Юбилей «Выбор» 12 лет', when: '5 дек · 18:00', place: 'по анонсу' }
]

const flyerInWork = flyers.filter(f => f.status !== 'sent').length
const online = messengers.filter(m => m.status === 'connected').length
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Обзор">
        <template #leading>
          <UDashboardSidebarToggle />
        </template>
        <template #right>
          <div class="hidden sm:flex items-center gap-3 me-2 text-xs text-[var(--desk-muted)]">
            <span class="inline-flex items-center gap-1.5">
              <span class="size-1.5 rounded-full bg-primary channel-dot-online" />
              {{ online }}/{{ messengers.length }}
            </span>
            <span>·</span>
            <span>{{ groups.length }} групп</span>
            <span>·</span>
            <span>{{ flyerInWork }} флаера</span>
          </div>
          <UButton
            to="/urgent"
            icon="i-lucide-megaphone"
            label="Срочное"
            color="error"
            size="sm"
            class="rounded-xl"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="desk-page-enter p-4 sm:p-6 flex flex-col gap-6 max-w-5xl">
        <header class="desk-surface-soft px-5 py-6 sm:px-7 sm:py-7">
          <p class="text-[11px] uppercase tracking-[0.18em] text-primary mb-2">
            Комитет Digital · М52
          </p>
          <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--desk-ink)]">
            Добро пожаловать за стол рассылки
          </h1>
          <p class="mt-2 text-sm text-[var(--desk-muted)] max-w-xl leading-relaxed">
            Расписание групп, флаеры и срочные — в три общих чата рассылки местности: Telegram, MAX и WhatsApp.
          </p>
          <div class="mt-5 flex flex-wrap gap-2">
            <UButton
              to="/schedule"
              icon="i-lucide-calendar-plus"
              label="Добавить собрание"
              class="rounded-xl"
            />
            <UButton
              to="/flyers"
              icon="i-lucide-upload"
              label="Загрузить флаер"
              color="neutral"
              variant="outline"
              class="rounded-xl"
            />
            <UButton
              to="/channels"
              icon="i-lucide-radio"
              label="Каналы"
              color="neutral"
              variant="ghost"
              class="rounded-xl"
            />
          </div>
        </header>

        <div class="grid gap-5 lg:grid-cols-2">
          <section class="desk-surface p-4 sm:p-5">
            <div class="flex items-baseline justify-between mb-3">
              <h2 class="font-display text-base font-semibold">
                Ближайшие события
              </h2>
              <UButton
                to="/flyers"
                label="Флаеры"
                variant="link"
                color="primary"
                size="xs"
              />
            </div>
            <ul class="flex flex-col gap-2">
              <li
                v-for="item in upcoming"
                :key="item.title"
                class="flex gap-3 rounded-xl bg-[var(--desk-elevated)]/80 px-3.5 py-3 ring-1 ring-[var(--desk-line)]"
              >
                <span class="mt-1.5 size-2 shrink-0 rounded-full bg-primary/80" />
                <div class="min-w-0">
                  <p class="text-sm font-medium">
                    {{ item.title }}
                  </p>
                  <p class="text-xs text-[var(--desk-muted)] mt-0.5">
                    {{ item.when }} · {{ item.place }}
                  </p>
                </div>
              </li>
            </ul>
          </section>

          <section class="flex flex-col gap-4">
            <div class="desk-surface p-4 sm:p-5">
              <div class="flex items-baseline justify-between mb-3">
                <h2 class="font-display text-base font-semibold">
                  Каналы
                </h2>
                <UButton
                  to="/channels"
                  label="Настроить"
                  variant="link"
                  color="primary"
                  size="xs"
                />
              </div>
              <ul class="flex flex-col gap-2">
                <li
                  v-for="ch in messengers"
                  :key="ch.id"
                  class="flex items-center gap-3 rounded-xl bg-[var(--desk-elevated)]/80 px-3.5 py-2.5 ring-1 ring-[var(--desk-line)]"
                >
                  <UIcon
                    :name="ch.icon"
                    class="size-4 text-primary shrink-0"
                  />
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium">
                      {{ ch.name }}
                    </p>
                    <p class="text-[11px] text-[var(--desk-muted)] truncate">
                      {{ ch.hint }}
                    </p>
                  </div>
                  <span
                    class="text-[11px]"
                    :class="ch.status === 'connected' ? 'text-primary' : ch.status === 'pending' ? 'text-warning' : 'text-[var(--desk-muted)]'"
                  >
                    {{ ch.status === 'connected' ? 'онлайн' : ch.status === 'pending' ? 'ждёт ключ' : 'офлайн' }}
                  </span>
                </li>
              </ul>
            </div>

            <div
              v-if="urgentHistory[0]"
              class="rounded-2xl border border-error/30 bg-error/10 px-4 py-3.5"
            >
              <div class="flex items-center gap-2 mb-1.5">
                <UIcon
                  name="i-lucide-megaphone"
                  class="size-3.5 text-error"
                />
                <span class="text-[11px] uppercase tracking-[0.12em] text-error font-semibold">
                  Последнее срочное
                </span>
                <span class="text-[11px] text-[var(--desk-muted)] ms-auto">
                  {{ urgentHistory[0].createdAt }}
                </span>
              </div>
              <p class="text-sm leading-snug">
                {{ urgentHistory[0].text }}
              </p>
              <div class="mt-2.5 flex flex-wrap gap-1">
                <UBadge
                  v-for="c in urgentHistory[0].channels"
                  :key="c"
                  :icon="channelMeta[c].icon"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                >
                  {{ channelMeta[c].label }}
                </UBadge>
              </div>
            </div>
          </section>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
