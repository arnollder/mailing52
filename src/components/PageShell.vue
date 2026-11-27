<script setup lang="ts">
import { inject } from 'vue'
import { Menu } from 'lucide-vue-next'
import ThemeToggle from '@/components/ThemeToggle.vue'

defineProps<{
  title: string
}>()

const openSidebar = inject<() => void>('openSidebar', () => {})
</script>

<template>
  <div class="flex min-h-0 min-w-0 flex-1 flex-col">
    <header class="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--desk-line)] bg-[var(--desk-elevated)]/80 px-4 backdrop-blur-md sm:px-5">
      <button
        type="button"
        class="btn btn-ghost btn-sm lg:hidden"
        aria-label="Меню"
        @click="openSidebar()"
      >
        <Menu class="size-4" />
      </button>
      <slot name="leading" />
      <h1 class="font-display min-w-0 truncate text-lg font-semibold tracking-tight text-[var(--desk-ink)]">
        {{ title }}
      </h1>
      <div class="ms-auto flex shrink-0 items-center gap-2">
        <ThemeToggle />
        <slot name="actions" />
      </div>
    </header>
    <div
      v-if="$slots.toolbar"
      class="flex min-w-0 items-center gap-3 border-b border-[var(--desk-line)] px-4 py-2.5 sm:px-5"
    >
      <slot name="toolbar" />
    </div>
    <div class="min-h-0 min-w-0 flex-1 overflow-auto">
      <slot />
    </div>
  </div>
</template>
