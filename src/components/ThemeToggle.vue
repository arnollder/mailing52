<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
import { useTheme } from '@/composables/useTheme'

const { isDark, toggle } = useTheme()
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    role="switch"
    :aria-checked="isDark"
    :aria-label="isDark ? 'Включить светлую тему' : 'Включить тёмную тему'"
    @click="toggle"
  >
    <span
      class="theme-toggle-knob"
      :class="isDark ? 'theme-toggle-knob-dark' : 'theme-toggle-knob-light'"
    >
      <Moon
        v-if="isDark"
        class="size-3.5"
        aria-hidden="true"
      />
      <Sun
        v-else
        class="size-3.5"
        aria-hidden="true"
      />
    </span>
  </button>
</template>
