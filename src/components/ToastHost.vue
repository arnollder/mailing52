<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { items, remove } = useToast()

const toneClass: Record<string, string> = {
  success: 'border-moss-500/40 bg-moss-500/15 text-moss-200',
  warning: 'border-amber-400/40 bg-amber-500/15 text-amber-100',
  error: 'border-ember-500/40 bg-ember-500/15 text-ember-200',
  info: 'border-moss-400/30 bg-[var(--desk-surface)] text-[var(--desk-ink)]',
  neutral: 'border-[var(--desk-line)] bg-[var(--desk-surface)] text-[var(--desk-ink)]'
}
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-3">
    <div
      v-for="t in items"
      :key="t.id"
      class="pointer-events-auto w-full max-w-sm rounded-xl border px-3.5 py-2.5 shadow-lg backdrop-blur-md"
      :class="toneClass[t.tone]"
      @click="remove(t.id)"
    >
      <p class="text-sm font-medium">
        {{ t.title }}
      </p>
      <p
        v-if="t.description"
        class="mt-0.5 text-xs opacity-80"
      >
        {{ t.description }}
      </p>
    </div>
  </div>
</template>
