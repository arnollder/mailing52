<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Award, BookOpen, Send, Upload, Users, X } from 'lucide-vue-next'
import PageShell from '@/components/PageShell.vue'
import { useToast } from '@/composables/useToast'
import {
  channelMeta,
  eventTypeLabel,
  flyers,
  type Channel,
  type EventType,
  type Flyer
} from '@/data/mock'

const toast = useToast()
const open = ref(false)
const files = ref<File | null>(null)

const form = reactive({
  title: '',
  type: 'meeting' as EventType,
  date: '',
  place: '',
  channels: ['telegram', 'max', 'whatsapp'] as Channel[],
  caption: ''
})

const allChannels: Channel[] = ['telegram', 'max', 'whatsapp']
const typeKeys = Object.keys(eventTypeLabel) as EventType[]

const statusLabel: Record<Flyer['status'], string> = {
  draft: 'черновик',
  scheduled: 'в очереди',
  sent: 'отправлен'
}

const previewClass: Record<Flyer['preview'], string> = {
  meeting: 'flyer-preview-meeting',
  seminar: 'flyer-preview-seminar',
  anniversary: 'flyer-preview-anniversary'
}

const previewIcon = {
  meeting: Users,
  seminar: BookOpen,
  anniversary: Award
}

function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  files.value = input.files?.[0] ?? null
}

function toggleChannel(c: Channel) {
  const i = form.channels.indexOf(c)
  if (i >= 0) form.channels.splice(i, 1)
  else form.channels.push(c)
}

function publish() {
  if (!form.title || !files.value) {
    toast.add({ title: 'Нужны название и файл флаера', tone: 'warning' })
    return
  }
  toast.add({
    title: 'Пока мок — не уходит в каналы',
    description: form.title,
    tone: 'info'
  })
  open.value = false
  files.value = null
  form.title = ''
  form.date = ''
  form.place = ''
  form.caption = ''
}
</script>

<template>
  <PageShell title="Флаеры">
    <template #actions>
      <button
        type="button"
        class="btn btn-primary btn-sm"
        @click="open = true"
      >
        <Upload class="size-3.5" />
        Загрузить
      </button>
    </template>

    <div class="desk-page-enter flex flex-col gap-5 p-4 sm:p-6">
      <p class="max-w-2xl text-sm leading-relaxed text-[var(--desk-muted)]">
        Рабочие собрания, семинары, юбилеи — загружаешь картинку и шлёшь в общие чаты рассылки М52.
      </p>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="flyer in flyers"
          :key="flyer.id"
          class="flyer-card overflow-hidden rounded-2xl border border-[var(--desk-line)] bg-[var(--desk-surface)]"
        >
          <div
            class="flyer-preview relative aspect-3/4 overflow-hidden"
            :class="previewClass[flyer.preview]"
          >
            <div class="absolute inset-0 grid place-items-center p-6 text-center">
              <div>
                <component
                  :is="previewIcon[flyer.preview]"
                  class="mx-auto mb-3 size-10 text-moss-400/90"
                />
                <p class="text-sm font-medium leading-snug text-[var(--desk-ink)]/95">
                  {{ flyer.title }}
                </p>
              </div>
            </div>
            <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
              <span class="badge flyer-badge">
                {{ statusLabel[flyer.status] }}
              </span>
            </div>
          </div>
          <div class="flex flex-col gap-1.5 p-4">
            <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-moss-400">
              {{ eventTypeLabel[flyer.type] }}
            </p>
            <h3 class="text-sm font-semibold leading-snug">
              {{ flyer.title }}
            </h3>
            <p class="text-xs text-[var(--desk-muted)]">
              {{ flyer.date }} · {{ flyer.place }}
            </p>
            <div class="flex flex-wrap gap-1 pt-1">
              <span
                v-for="c in flyer.channels"
                :key="c"
                class="badge"
              >
                {{ channelMeta[c].label }}
              </span>
            </div>
            <div class="flex gap-2 pt-2">
              <button
                type="button"
                class="btn btn-primary btn-sm"
                :disabled="flyer.status === 'sent'"
                @click="toast.add({ title: 'В чаты местности (мок)', description: flyer.title, tone: 'info' })"
              >
                <Send class="size-3.5" />
                В рассылку
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>

    <div
      v-if="open"
      class="desk-overlay fixed inset-0 z-50 flex justify-end"
      @click.self="open = false"
    >
      <aside class="flex h-full w-full max-w-md flex-col border-l border-[var(--desk-line)] bg-[var(--desk-surface)]">
        <div class="flex items-center justify-between border-b border-[var(--desk-line)] px-4 py-3.5">
          <h3 class="font-display font-semibold">
            Новый флаер
          </h3>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            @click="open = false"
          >
            <X class="size-4" />
          </button>
        </div>

        <div class="flex flex-1 flex-col gap-4 overflow-auto p-4">
          <label class="field">
            <span class="field-label">Файл *</span>
            <input
              class="input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              @change="onFile"
            >
            <span
              v-if="files"
              class="text-xs text-[var(--desk-muted)]"
            >{{ files.name }}</span>
          </label>

          <label class="field">
            <span class="field-label">Название *</span>
            <input
              v-model="form.title"
              class="input"
              placeholder="Семинар / юбилей / рабочка"
            >
          </label>

          <label class="field">
            <span class="field-label">Тип</span>
            <select
              v-model="form.type"
              class="select"
            >
              <option
                v-for="k in typeKeys"
                :key="k"
                :value="k"
              >
                {{ eventTypeLabel[k] }}
              </option>
            </select>
          </label>

          <div class="grid grid-cols-2 gap-3">
            <label class="field">
              <span class="field-label">Дата и время</span>
              <input
                v-model="form.date"
                class="input"
                placeholder="11 окт, 15:00"
              >
            </label>
            <label class="field">
              <span class="field-label">Место</span>
              <input
                v-model="form.place"
                class="input"
                placeholder="группа «Антей»"
              >
            </label>
          </div>

          <label class="field">
            <span class="field-label">Подпись</span>
            <textarea
              v-model="form.caption"
              class="textarea"
              rows="3"
              placeholder="Текст вместе с флаером"
            />
          </label>

          <div class="field">
            <span class="field-label">Каналы рассылки</span>
            <div class="flex flex-col gap-2">
              <label
                v-for="c in allChannels"
                :key="c"
                class="inline-flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  class="accent-moss-500"
                  :checked="form.channels.includes(c)"
                  @change="toggleChannel(c)"
                >
                {{ channelMeta[c].label }}
              </label>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 border-t border-[var(--desk-line)] p-4">
          <button
            type="button"
            class="btn btn-outline"
            @click="toast.add({ title: 'Черновик сохранён', tone: 'neutral' })"
          >
            Черновик
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="publish"
          >
            <Send class="size-4" />
            В рассылку
          </button>
        </div>
      </aside>
    </div>
  </PageShell>
</template>
