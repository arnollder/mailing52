<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { channelMeta, groups, type Channel, type GroupMeeting } from '~/utils/mock'

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

const channelOptions = [
  { label: 'Telegram', value: 'telegram' },
  { label: 'MAX', value: 'max' },
  { label: 'WhatsApp', value: 'whatsapp' }
]

const formatOptions = ['Открытое', 'Закрытое', 'Онлайн']

const rows = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return groups
  return groups.filter(g =>
    [g.group, g.city, g.address, g.day].some(v => v.toLowerCase().includes(q))
  )
})

const columns: TableColumn<GroupMeeting>[] = [
  { accessorKey: 'group', header: 'Группа' },
  { accessorKey: 'city', header: 'Город' },
  { accessorKey: 'day', header: 'Дни' },
  { accessorKey: 'time', header: 'Время' },
  { accessorKey: 'address', header: 'Адрес' },
  { accessorKey: 'format', header: 'Формат' },
  { accessorKey: 'channels', header: 'Каналы' },
  { id: 'actions', header: '' }
]

function saveGroup() {
  if (!form.group || !form.day || !form.time) {
    toast.add({ title: 'Заполни группу, дни и время', color: 'warning' })
    return
  }
  toast.add({
    title: 'Собрание добавлено',
    description: `${form.group} · ${form.day} ${form.time}`,
    color: 'success',
    icon: 'i-lucide-calendar-check'
  })
  open.value = false
  form.group = ''
  form.day = ''
  form.time = ''
  form.address = ''
}
</script>

<template>
  <UDashboardPanel id="schedule">
    <template #header>
      <UDashboardNavbar title="Расписание">
        <template #leading>
          <UDashboardSidebarToggle />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-plus"
            label="Добавить"
            size="sm"
            class="rounded-xl"
            @click="open = true"
          />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar :ui="{ root: 'border-b border-[var(--desk-line)]' }">
        <template #left>
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Группа, город, адрес…"
            size="sm"
            class="w-64"
            :ui="{ base: 'rounded-xl' }"
          />
        </template>
        <template #right>
          <span class="text-xs text-[var(--desk-muted)] tabular-nums">
            {{ rows.length }}
          </span>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="desk-page-enter p-4 sm:p-6">
        <p class="text-sm text-[var(--desk-muted)] mb-4 max-w-2xl leading-relaxed">
          Рабочие и открытые собрания групп АН М52. По этим данным уходит регулярная рассылка.
        </p>

        <div class="desk-surface overflow-hidden rounded-2xl">
          <UTable
            :data="rows"
            :columns="columns"
            :ui="{
              thead: 'bg-[var(--desk-elevated)]',
              th: 'text-xs font-medium text-[var(--desk-muted)]',
              td: 'text-sm'
            }"
          >
            <template #group-cell="{ row }">
              <span class="font-semibold text-primary">{{ row.original.group }}</span>
            </template>
            <template #channels-cell="{ row }">
              <div class="flex flex-wrap gap-1">
                <UTooltip
                  v-for="c in row.original.channels"
                  :key="c"
                  :text="channelMeta[c].label"
                >
                  <span class="inline-flex size-7 items-center justify-center rounded-lg bg-[var(--desk-elevated)] ring-1 ring-[var(--desk-line)]">
                    <UIcon
                      :name="channelMeta[c].icon"
                      class="size-3.5 text-primary"
                    />
                  </span>
                </UTooltip>
              </div>
            </template>
            <template #actions-cell>
              <UButton
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                size="xs"
                aria-label="Редактировать"
              />
            </template>
          </UTable>
        </div>
      </div>

      <UModal v-model:open="open">
        <template #content>
          <UCard :ui="{ root: 'rounded-2xl bg-[var(--desk-surface)]' }">
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h3 class="font-display font-semibold">
                  Новое собрание
                </h3>
                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  @click="open = false"
                />
              </div>
            </template>

            <div class="grid gap-3 sm:grid-cols-2">
              <UFormField
                label="Группа"
                required
                class="sm:col-span-2"
              >
                <UInput
                  v-model="form.group"
                  placeholder="Антей"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="Город">
                <UInput
                  v-model="form.city"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="Формат">
                <USelect
                  v-model="form.format"
                  :items="formatOptions"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                label="Дни"
                required
              >
                <UInput
                  v-model="form.day"
                  placeholder="Пн, Ср, Пт"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                label="Время"
                required
              >
                <UInput
                  v-model="form.time"
                  placeholder="19:00"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                label="Адрес"
                class="sm:col-span-2"
              >
                <UInput
                  v-model="form.address"
                  placeholder="улица, дом, ориентир"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                label="Каналы рассылки местности"
                class="sm:col-span-2"
              >
                <UCheckboxGroup
                  v-model="form.channels"
                  :items="channelOptions"
                  orientation="horizontal"
                />
              </UFormField>
            </div>

            <template #footer>
              <div class="flex justify-end gap-2">
                <UButton
                  label="Отмена"
                  color="neutral"
                  variant="ghost"
                  class="rounded-xl"
                  @click="open = false"
                />
                <UButton
                  label="Сохранить"
                  icon="i-lucide-check"
                  class="rounded-xl"
                  @click="saveGroup"
                />
              </div>
            </template>
          </UCard>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
