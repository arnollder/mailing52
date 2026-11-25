<script setup lang="ts">
import { messengers } from '~/utils/mock'

const toast = useToast()

const secrets = reactive({
  telegramToken: '',
  telegramChatId: messengers.find(m => m.id === 'telegram')?.chatId ?? '',
  maxToken: '',
  maxChatId: '',
  greenId: '',
  greenToken: '',
  whatsappChatId: ''
})

function save(name: string) {
  toast.add({
    title: `${name}: сохранено (мок)`,
    description: 'На бэке — в секреты, не в репозиторий',
    color: 'success',
    icon: 'i-lucide-shield-check'
  })
}

const needs = [
  {
    title: 'Telegram',
    items: [
      'Один чат рассылки местности (супергруппа / канал)',
      'Токен бота от @BotFather',
      'Бот добавлен в этот один чат (право писать)',
      'chat_id этого чата'
    ]
  },
  {
    title: 'MAX',
    items: [
      'Один чат рассылки местности в MAX',
      'Бот в кабинете MAX + токен',
      'ID этого чата'
    ]
  },
  {
    title: 'WhatsApp',
    items: [
      'Одна группа WhatsApp на местность',
      'Green-API / Wazzup: instance + token',
      'или Meta WABA + id группы (…@g.us)'
    ]
  }
]
</script>

<template>
  <UDashboardPanel id="channels">
    <template #header>
      <UDashboardNavbar title="Каналы">
        <template #leading>
          <UDashboardSidebarToggle />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="desk-page-enter p-4 sm:p-6 flex flex-col gap-6 max-w-5xl">
        <div class="desk-surface-soft rounded-2xl px-5 py-4">
          <p class="text-sm text-[var(--desk-ink)] font-medium">
            Одна рассылка на всю местность М52
          </p>
          <p class="text-sm text-[var(--desk-muted)] mt-1 leading-relaxed">
            Не бот в каждой группе — три канала (Telegram, MAX, WhatsApp), в каждом по одному общему чату рассылки. Туда уходят флаеры, расписание и срочные.
          </p>
        </div>

        <div class="grid gap-3 lg:grid-cols-3">
          <article
            v-for="ch in messengers"
            :key="ch.id"
            class="desk-surface rounded-2xl p-4 flex flex-col gap-3"
          >
            <div class="flex items-start gap-2.5">
              <span class="grid size-9 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
                <UIcon
                  :name="ch.icon"
                  class="size-4"
                />
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-semibold">
                    {{ ch.name }}
                  </h3>
                  <span
                    class="text-[11px]"
                    :class="ch.status === 'connected' ? 'text-primary' : ch.status === 'pending' ? 'text-warning' : 'text-[var(--desk-muted)]'"
                  >
                    {{ ch.status === 'connected' ? 'подключён' : ch.status === 'pending' ? 'ждёт ключ' : 'офлайн' }}
                  </span>
                </div>
                <p class="text-[11px] text-[var(--desk-muted)] mt-0.5">
                  {{ ch.chatTitle }}
                </p>
                <p class="text-[11px] text-[var(--desk-muted)] truncate">
                  {{ ch.hint }}
                </p>
              </div>
            </div>

            <template v-if="ch.id === 'telegram'">
              <UFormField label="Bot token">
                <UInput
                  v-model="secrets.telegramToken"
                  type="password"
                  placeholder="123456:AA..."
                  size="sm"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="chat_id чата рассылки">
                <UInput
                  v-model="secrets.telegramChatId"
                  placeholder="-100…"
                  size="sm"
                  class="w-full font-mono"
                />
              </UFormField>
            </template>
            <template v-else-if="ch.id === 'max'">
              <UFormField label="MAX bot token">
                <UInput
                  v-model="secrets.maxToken"
                  type="password"
                  placeholder="токен бота MAX"
                  size="sm"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="ID чата рассылки">
                <UInput
                  v-model="secrets.maxChatId"
                  placeholder="id чата местности"
                  size="sm"
                  class="w-full font-mono"
                />
              </UFormField>
            </template>
            <template v-else>
              <UFormField label="idInstance">
                <UInput
                  v-model="secrets.greenId"
                  placeholder="1101..."
                  size="sm"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="apiTokenInstance">
                <UInput
                  v-model="secrets.greenToken"
                  type="password"
                  placeholder="токен инстанса"
                  size="sm"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="ID группы рассылки">
                <UInput
                  v-model="secrets.whatsappChatId"
                  placeholder="…@g.us"
                  size="sm"
                  class="w-full font-mono"
                />
              </UFormField>
            </template>

            <UButton
              label="Сохранить"
              icon="i-lucide-save"
              size="sm"
              block
              class="rounded-xl"
              @click="save(ch.name)"
            />
          </article>
        </div>

        <section>
          <h2 class="font-display text-sm font-semibold mb-3">
            Что нужно подключить
          </h2>
          <div class="grid gap-3 md:grid-cols-3">
            <div
              v-for="block in needs"
              :key="block.title"
              class="desk-surface rounded-2xl p-4"
            >
              <h3 class="text-sm font-semibold text-primary mb-2">
                {{ block.title }}
              </h3>
              <ul class="flex flex-col gap-1.5">
                <li
                  v-for="item in block.items"
                  :key="item"
                  class="flex gap-2 text-xs text-[var(--desk-muted)]"
                >
                  <span class="text-primary mt-0.5">·</span>
                  <span>{{ item }}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>
