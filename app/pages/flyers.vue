<script setup lang="ts">
import { channelMeta, eventTypeLabel, flyers, type Channel, type EventType, type Flyer } from '~/utils/mock'

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

const typeItems = (Object.keys(eventTypeLabel) as EventType[]).map(k => ({
  label: eventTypeLabel[k],
  value: k
}))

const channelOptions = [
  { label: 'Telegram', value: 'telegram' },
  { label: 'MAX', value: 'max' },
  { label: 'WhatsApp', value: 'whatsapp' }
]

const statusColor: Record<Flyer['status'], 'neutral' | 'warning' | 'success'> = {
  draft: 'neutral',
  scheduled: 'warning',
  sent: 'success'
}

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

const previewIcon: Record<Flyer['preview'], string> = {
  meeting: 'i-lucide-users',
  seminar: 'i-lucide-book-open',
  anniversary: 'i-lucide-award'
}

function publish() {
  if (!form.title || !files.value) {
    toast.add({ title: 'Нужны название и файл флаера', color: 'warning' })
    return
  }
  toast.add({
    title: 'Флаер в рассылку',
    description: form.title,
    color: 'success',
    icon: 'i-lucide-send'
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
  <UDashboardPanel id="flyers">
    <template #header>
      <UDashboardNavbar title="Флаеры">
        <template #leading>
          <UDashboardSidebarToggle />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-upload"
            label="Загрузить"
            size="sm"
            class="rounded-xl"
            @click="open = true"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="desk-page-enter p-4 sm:p-6 flex flex-col gap-5">
        <p class="text-sm text-[var(--desk-muted)] max-w-2xl leading-relaxed">
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
                  <UIcon
                    :name="previewIcon[flyer.preview]"
                    class="size-10 text-primary/90 mx-auto mb-3"
                  />
                  <p class="text-sm font-medium text-[var(--desk-ink)]/95 leading-snug">
                    {{ flyer.title }}
                  </p>
                </div>
              </div>
              <div class="absolute inset-x-0 bottom-0 p-3 bg-linear-to-t from-black/60 to-transparent">
                <UBadge
                  :color="statusColor[flyer.status]"
                  variant="solid"
                  size="sm"
                >
                  {{ statusLabel[flyer.status] }}
                </UBadge>
              </div>
            </div>
            <div class="p-4 flex flex-col gap-1.5">
              <p class="text-[11px] uppercase tracking-[0.12em] text-primary font-semibold">
                {{ eventTypeLabel[flyer.type] }}
              </p>
              <h3 class="text-sm font-semibold leading-snug">
                {{ flyer.title }}
              </h3>
              <p class="text-xs text-[var(--desk-muted)]">
                {{ flyer.date }} · {{ flyer.place }}
              </p>
              <div class="flex flex-wrap gap-1 pt-1">
                <UBadge
                  v-for="c in flyer.channels"
                  :key="c"
                  :icon="channelMeta[c].icon"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                >
                  {{ channelMeta[c].label }}
                </UBadge>
              </div>
              <div class="flex gap-2 pt-2">
                <UButton
                  label="В рассылку"
                  icon="i-lucide-send"
                  size="xs"
                  class="rounded-lg"
                  :disabled="flyer.status === 'sent'"
                  @click="toast.add({ title: 'В чаты местности (мок)', description: flyer.title, color: 'info' })"
                />
                <UButton
                  icon="i-lucide-pencil"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                />
              </div>
            </div>
          </article>
        </div>
      </div>

      <USlideover v-model:open="open">
        <template #content>
          <UCard class="flex flex-col h-full rounded-none bg-[var(--desk-surface)]">
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="font-display font-semibold">
                  Новый флаер
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

            <div class="flex flex-col gap-4">
              <UFormField
                label="Файл"
                required
              >
                <UFileUpload
                  v-model="files"
                  accept="image/png,image/jpeg,image/webp"
                  label="Перетащи флаер сюда"
                  description="PNG / JPG / WebP"
                  class="w-full min-h-36"
                />
              </UFormField>

              <UFormField
                label="Название"
                required
              >
                <UInput
                  v-model="form.title"
                  placeholder="Семинар / юбилей / рабочка"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Тип">
                <USelect
                  v-model="form.type"
                  :items="typeItems"
                  value-key="value"
                  class="w-full"
                />
              </UFormField>

              <div class="grid grid-cols-2 gap-3">
                <UFormField label="Дата и время">
                  <UInput
                    v-model="form.date"
                    placeholder="11 окт, 15:00"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Место">
                  <UInput
                    v-model="form.place"
                    placeholder="группа «Антей»"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <UFormField label="Подпись">
                <UTextarea
                  v-model="form.caption"
                  :rows="3"
                  placeholder="Текст вместе с флаером"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Каналы рассылки (по одному чату на местность)">
                <UCheckboxGroup
                  v-model="form.channels"
                  :items="channelOptions"
                />
              </UFormField>
            </div>

            <template #footer>
              <div class="flex justify-end gap-2">
                <UButton
                  label="Черновик"
                  color="neutral"
                  variant="outline"
                  class="rounded-xl"
                  @click="toast.add({ title: 'Черновик сохранён', color: 'neutral' })"
                />
                <UButton
                  label="В рассылку"
                  icon="i-lucide-send"
                  class="rounded-xl"
                  @click="publish"
                />
              </div>
            </template>
          </UCard>
        </template>
      </USlideover>
    </template>
  </UDashboardPanel>
</template>
