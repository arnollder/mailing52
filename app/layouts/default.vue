<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { messengers } from '~/utils/mock'

const route = useRoute()

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Обзор',
    icon: 'i-lucide-house',
    to: '/',
    active: route.path === '/'
  },
  {
    label: 'Расписание',
    icon: 'i-lucide-calendar-days',
    to: '/schedule',
    active: route.path.startsWith('/schedule')
  },
  {
    label: 'Флаеры',
    icon: 'i-lucide-image',
    to: '/flyers',
    active: route.path.startsWith('/flyers')
  },
  {
    label: 'Срочное',
    icon: 'i-lucide-megaphone',
    to: '/urgent',
    active: route.path.startsWith('/urgent')
  },
  {
    label: 'Каналы',
    icon: 'i-lucide-radio',
    to: '/channels',
    active: route.path.startsWith('/channels')
  }
])

const onlineCount = computed(() => messengers.filter(m => m.status === 'connected').length)
const channelTotal = computed(() => messengers.length)
</script>

<template>
  <div class="desk-shell min-h-svh text-[var(--desk-ink)]">
    <UDashboardGroup storage-key="digital-desk-dark">
      <UDashboardSidebar
        collapsible
        :ui="{
          root: 'bg-[var(--desk-elevated)]/90 backdrop-blur-md border-r border-[var(--desk-line)] w-60',
          header: 'border-b border-[var(--desk-line)] px-3 py-3.5',
          body: 'px-2 py-3',
          footer: 'border-t border-[var(--desk-line)] px-3 py-3.5'
        }"
      >
        <template #header="{ collapsed }">
          <NuxtLink
            to="/"
            class="flex items-center gap-2.5 min-w-0"
          >
            <span
              class="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30 text-xs font-bold tracking-wide"
              aria-hidden="true"
            >
              NA
            </span>
            <span
              v-if="!collapsed"
              class="min-w-0 leading-tight"
            >
              <span class="font-display block text-[15px] font-semibold text-[var(--desk-ink)] truncate">
                Digital
              </span>
              <span class="block text-[11px] text-[var(--desk-muted)] truncate">
                М52 · рассылка в чаты
              </span>
            </span>
          </NuxtLink>
        </template>

        <template #default="{ collapsed }">
          <UNavigationMenu
            :collapsed="collapsed"
            :items="items"
            orientation="vertical"
            class="w-full"
            :ui="{
              link: 'desk-rail-link rounded-xl text-sm',
              linkLeadingIcon: 'size-4'
            }"
          />
        </template>

        <template #footer="{ collapsed }">
          <div
            v-if="!collapsed"
            class="space-y-3"
          >
            <div class="rounded-xl bg-primary/8 ring-1 ring-primary/20 px-3 py-2.5">
              <p class="text-[10px] uppercase tracking-[0.14em] text-primary/80 mb-1">
                Каналы
              </p>
              <p class="text-[12px] text-[var(--desk-muted)]">
                {{ onlineCount }} из {{ channelTotal }} каналов · по 1 чату
              </p>
            </div>
            <UButton
              to="/urgent"
              label="Срочное сообщение"
              icon="i-lucide-megaphone"
              color="error"
              size="sm"
              block
              class="rounded-xl"
            />
          </div>
          <UButton
            v-else
            to="/urgent"
            icon="i-lucide-megaphone"
            color="error"
            size="sm"
            square
            block
            class="rounded-xl"
          />
        </template>
      </UDashboardSidebar>

      <slot />
    </UDashboardGroup>
  </div>
</template>
