import { computed, ref } from 'vue'

const STORAGE_KEY = 'mailing52-api-key'
const apiKey = ref('')

function readStored(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export function bootApiKey() {
  apiKey.value = readStored()
}

export function useApiKey() {
  if (!apiKey.value) apiKey.value = readStored()

  const hasKey = computed(() => apiKey.value.trim().length > 0)

  function setApiKey(next: string) {
    const v = next.trim()
    apiKey.value = v
    try {
      if (v) localStorage.setItem(STORAGE_KEY, v)
      else localStorage.removeItem(STORAGE_KEY)
    } catch { /* ignore */ }
  }

  function apiHeaders(extra: HeadersInit = {}): HeadersInit {
    const headers: Record<string, string> = { ...(extra as Record<string, string>) }
    if (apiKey.value) headers['X-Api-Key'] = apiKey.value
    return headers
  }

  function qrUrl() {
    const base = '/api/wa/qr'
    if (!apiKey.value) return base
    return `${base}?key=${encodeURIComponent(apiKey.value)}`
  }

  return { apiKey, hasKey, setApiKey, apiHeaders, qrUrl }
}
