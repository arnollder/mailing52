<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Check, Plus, X } from 'lucide-vue-next'
import PageShell from '@/components/PageShell.vue'
import { useToast } from '@/composables/useToast'
import { channelMeta, groups, type Channel } from '@/data/mock'

const toast = useToast()
const search = ref('')
const open = ref(false)

const form = reactive({
  group: '',
  city: 'Н. Новгород',
  day: '',
  time: '',
  address: '',
  format: 'Открытое',
  channels: ['telegram', 'max', 'whatsapp'] as Channel[]
})

const formatOptions = ['Открытое', 'Закрытое', 'Онлайн']
const allChannels: Channel[] = ['telegram', 'max', 'whatsapp']

const rows = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return groups
  return groups.filter(g =>
    [g.group, g.city, g.address, g.day].some(v => v.toLowerCase().includes(q))
  )
})

function toggleChannel(c: Channel) {
  const i = form.channels.indexOf(c)
  if (i >= 0) form.channels.splice(i, 1)
  else form.channels.push(c)
}

function saveGroup() {
  if (!form.group || !form.day || !form.time) {
    toast.add({ title: 'Заполни группу, дни и время', tone: 'warning' })
    return
  }
  toast.add({
    title: 'Пока мок — не сохраняется',
    description: `${form.group} · ${form.day} ${form.time}`,
    tone: 'info'
  })
  open.value = false
  form.group = ''
  form.day = ''
  form.time = ''
  form.address = ''
}
</script>

<template>
  <PageShell title="Расписание">
    <template #actions>
      <button
        type="button"
        class="btn btn-primary btn-sm"
        @click="open = true"
      >
        <Plus class="size-3.5" />
        Добавить
      </button>
    </template>

    <template #toolbar>
      <input
        v-model="search"
        class="input w-64"
        placeholder="Группа, город, адрес…"
      >
      <span class="ms-auto text-xs tabular-nums text-[var(--desk-muted)]">
        {{ rows.length }}
      </span>
    </template>

    <div class="desk-page-enter p-4 sm:p-6">
      <p class="mb-4 max-w-2xl text-sm leading-relaxed text-[var(--desk-muted)]">
        Рабочие и открытые собрания групп АН М52. По этим данным уходит регулярная рассылка.
      </p>

      <div class="desk-surface overflow-x-auto rounded-2xl">
        <table class="w-full min-w-[720px] text-left text-sm">
          <thead class="bg-[var(--desk-elevated)] text-xs text-[var(--desk-muted)]">
            <tr>
              <th class="px-3 py-2.5 font-medium">
                Группа
              </th>
              <th class="px-3 py-2.5 font-medium">
                Город
              </th>
              <th class="px-3 py-2.5 font-medium">
                Дни
              </th>
              <th class="px-3 py-2.5 font-medium">
                Время
              </th>
              <th class="px-3 py-2.5 font-medium">
                Адрес
              </th>
              <th class="px-3 py-2.5 font-medium">
                Формат
              </th>
              <th class="px-3 py-2.5 font-medium">
                Каналы
              </th>
              <th class="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.id"
              class="border-t border-[var(--desk-line)]"
            >
              <td class="px-3 py-2.5 font-semibold text-moss-400">
                {{ row.group }}
              </td>
              <td class="px-3 py-2.5">
                {{ row.city }}
              </td>
              <td class="px-3 py-2.5">
                {{ row.day }}
              </td>
              <td class="px-3 py-2.5">
                {{ row.time }}
              </td>
              <td class="px-3 py-2.5 text-[var(--desk-muted)]">
                {{ row.address }}
              </td>
              <td class="px-3 py-2.5">
                {{ row.format }}
              </td>
              <td class="px-3 py-2.5">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="c in row.channels"
                    :key="c"
                    class="inline-flex size-7 items-center justify-center rounded-lg bg-[var(--desk-elevated)] text-[10px] font-bold text-moss-400 ring-1 ring-[var(--desk-line)]"
                    :title="channelMeta[c].label"
                  >
                    {{ channelMeta[c].short }}
                  </span>
                </div>
              </td>
              <td class="px-3 py-2.5 text-[11px] text-[var(--desk-muted)]">
                мок
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="open"
      class="desk-overlay fixed inset-0 z-50 grid place-items-center p-4"
      @click.self="open = false"
    >
      <div class="desk-surface w-full max-w-lg rounded-2xl p-5">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h3 class="font-display font-semibold">
            Новое собрание
          </h3>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            @click="open = false"
          >
            <X class="size-4" />
          </button>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="field sm:col-span-2">
            <span class="field-label">Группа *</span>
            <input
              v-model="form.group"
              class="input"
              placeholder="Антей"
            >
          </label>
          <label class="field">
            <span class="field-label">Город</span>
            <input
              v-model="form.city"
              class="input"
            >
          </label>
          <label class="field">
            <span class="field-label">Формат</span>
            <select
              v-model="form.format"
              class="select"
            >
              <option
                v-for="f in formatOptions"
                :key="f"
                :value="f"
              >
                {{ f }}
              </option>
            </select>
          </label>
          <label class="field">
            <span class="field-label">Дни *</span>
            <input
              v-model="form.day"
              class="input"
              placeholder="Пн, Ср, Пт"
            >
          </label>
          <label class="field">
            <span class="field-label">Время *</span>
            <input
              v-model="form.time"
              class="input"
              placeholder="19:00"
            >
          </label>
          <label class="field sm:col-span-2">
            <span class="field-label">Адрес</span>
            <input
              v-model="form.address"
              class="input"
              placeholder="улица, дом, ориентир"
            >
          </label>
          <div class="field sm:col-span-2">
            <span class="field-label">Каналы рассылки местности</span>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="c in allChannels"
                :key="c"
                class="inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ring-[var(--desk-line)]"
                :class="form.channels.includes(c) ? 'bg-moss-500/15 text-moss-300' : 'text-[var(--desk-muted)]'"
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

        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="btn btn-ghost"
            @click="open = false"
          >
            Отмена
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="saveGroup"
          >
            <Check class="size-4" />
            Сохранить
          </button>
        </div>
      </div>
    </div>
  </PageShell>
</template>
