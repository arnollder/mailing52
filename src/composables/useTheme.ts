import { computed, ref } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'mailing52-theme'
const theme = ref<Theme>('dark')

function preferSystem(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function readStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark') return raw
  } catch { /* private mode */ }
  return preferSystem()
}

function applyTheme(next: Theme) {
  theme.value = next
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = next
  document.documentElement.style.colorScheme = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch { /* ignore */ }
}

/** Вызвать до mount, чтобы не мигало. */
export function bootTheme() {
  applyTheme(readStoredTheme())
}

export function useTheme() {
  const isDark = computed(() => theme.value === 'dark')

  function toggle() {
    applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { isDark, toggle }
}
