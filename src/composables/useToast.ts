import { reactive } from 'vue'

export type ToastTone = 'success' | 'warning' | 'error' | 'info' | 'neutral'

export interface ToastItem {
  id: number
  title: string
  description?: string
  tone: ToastTone
}

const state = reactive({
  items: [] as ToastItem[]
})

let seq = 1

export function useToast() {
  function add(input: { title: string, description?: string, tone?: ToastTone }) {
    const id = seq++
    state.items.push({
      id,
      title: input.title,
      description: input.description,
      tone: input.tone ?? 'info'
    })
    window.setTimeout(() => remove(id), 3200)
  }

  function remove(id: number) {
    const i = state.items.findIndex(t => t.id === id)
    if (i >= 0) state.items.splice(i, 1)
  }

  return { items: state.items, add, remove }
}
