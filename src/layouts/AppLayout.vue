<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  CalendarDays,
  House,
  Image,
  Megaphone,
  Radio,
  X
} from 'lucide-vue-next'
import { useChannels } from '@/composables/useChannels'

const route = useRoute()
const open = ref(false)
const { channels, onlineCount } = useChannels()

provide('openSidebar', () => {
  open.value = true
})

const items = [
  { label: 'Обзор', to: '/', icon: House },
  { label: 'Расписание', to: '/schedule', icon: CalendarDays },
  { label: 'Флаеры', to: '/flyers', icon: Image },
  { label: 'Срочное', to: '/urgent', icon: Megaphone },
  { label: 'Каналы', to: '/channels', icon: Radio }
]

const channelTotal = computed(() => channels.value.length || 3)

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function close() {
  open.value = false
}
</script>

<template>
  <div class="desk-shell flex min-h-svh min-w-0 overflow-x-hidden text-[var(--desk-ink)]">
    <div
      v-if="open"
      class="desk-overlay fixed inset-0 z-30 lg:hidden"
      @click="close"
    />

    <aside
      class="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-[var(--desk-line)] bg-[var(--desk-elevated)]/95 backdrop-blur-md transition-transform lg:static lg:translate-x-0"
      :class="open ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex items-center gap-2.5 border-b border-[var(--desk-line)] px-3 py-3.5">
        <RouterLink
          to="/"
          class="flex min-w-0 items-center gap-2.5"
          @click="close"
        >
          <span class="grid size-9 shrink-0 place-items-center rounded-xl bg-moss-500/15 text-xs font-bold tracking-wide text-moss-400 ring-1 ring-moss-400/30">
            NA
          </span>
          <span class="min-w-0 leading-tight">
            <span class="font-display block truncate text-[15px] font-semibold">Digital</span>
            <span class="block truncate text-[11px] text-[var(--desk-muted)]">М52 · рассылка в чаты</span>
          </span>
        </RouterLink>
        <button
          type="button"
          class="btn btn-ghost ms-auto lg:hidden"
          aria-label="Закрыть меню"
          @click="close"
        >
          <X class="size-4" />
        </button>
      </div>

      <nav class="flex flex-1 flex-col gap-1 px-2 py-3">
        <RouterLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors"
          :class="isActive(item.to)
            ? 'nav-link-active'
            : 'nav-link-idle text-[var(--desk-muted)]'"
          @click="close"
        >
          <component
            :is="item.icon"
            class="size-4 shrink-0"
          />
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="space-y-3 border-t border-[var(--desk-line)] px-3 py-3.5">
        <div class="rounded-xl bg-moss-500/10 px-3 py-2.5 ring-1 ring-moss-400/20">
          <p class="mb-1 text-[10px] uppercase tracking-[0.14em] text-moss-400/80">
            Каналы
          </p>
          <p class="text-[12px] text-[var(--desk-muted)]">
            {{ onlineCount }} из {{ channelTotal }} каналов · по 1 чату
          </p>
        </div>
        <RouterLink
          to="/urgent"
          class="btn btn-danger btn-sm btn-block"
          @click="close"
        >
          <Megaphone class="size-3.5" />
          Срочное сообщение
        </RouterLink>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <slot />
    </div>
  </div>
</template>
