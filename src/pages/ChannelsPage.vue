<script setup lang="ts">
import { reactive } from 'vue'
import { Save } from 'lucide-vue-next'
import PageShell from '@/components/PageShell.vue'
import { useToast } from '@/composables/useToast'
import { maxChannel } from '@/config/max'
import { messengers } from '@/data/mock'

const toast = useToast()

const secrets = reactive({
  telegramToken: '',
  telegramChatId: messengers.find(m => m.id === 'telegram')?.chatId ?? '',
  maxToken: '',
  maxChatId: maxChannel.chatId,
  greenId: '',
  greenToken: '',
  whatsappChatId: ''
})

function save(name: string) {
  toast.add({
    title: `${name}: сохранено (мок)`,
    description: 'На бэке — в секреты, не в репозиторий',
    tone: 'success'
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
      `Канал ${maxChannel.link}`,
      `Бот @${maxChannel.botUsername}`,
      `chat_id ${maxChannel.chatId} · токен в .env (не в репо)`
    ]
  },
  {
    title: 'WhatsApp',
    items: [
      'Одна группа WhatsApp на местность',
      'Baileys (ветка feat/whatsapp-baileys): pnpm wa:login → QR',
      'WA_GROUP_JID=…@g.us в .env · сессия в .wa-auth/'
    ]
  }
]
</script>

<template>
  <PageShell title="Каналы">
    <div class="desk-page-enter mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-6">
      <div class="desk-surface-soft rounded-2xl px-5 py-4">
        <p class="text-sm font-medium">
          Одна рассылка на всю местность М52
        </p>
        <p class="mt-1 text-sm leading-relaxed text-[var(--desk-muted)]">
          Не бот в каждой группе — три канала (Telegram, MAX, WhatsApp), в каждом по одному общему чату рассылки. Туда уходят флаеры, расписание и срочные.
        </p>
      </div>

      <div class="grid gap-3 lg:grid-cols-3">
        <article
          v-for="ch in messengers"
          :key="ch.id"
          class="desk-surface flex flex-col gap-3 rounded-2xl p-4"
        >
          <div class="flex items-start gap-2.5">
            <span class="grid size-9 place-items-center rounded-xl bg-moss-500/12 text-xs font-bold text-moss-400 ring-1 ring-moss-400/25">
              {{ ch.short }}
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-semibold">
                  {{ ch.name }}
                </h3>
                <span
                  class="text-[11px]"
                  :class="ch.status === 'connected' ? 'text-moss-400' : ch.status === 'pending' ? 'text-warning' : 'text-[var(--desk-muted)]'"
                >
                  {{ ch.status === 'connected' ? 'подключён' : ch.status === 'pending' ? 'ждёт ключ' : 'офлайн' }}
                </span>
              </div>
              <p class="mt-0.5 text-[11px] text-[var(--desk-muted)]">
                {{ ch.chatTitle }}
              </p>
              <p class="truncate text-[11px] text-[var(--desk-muted)]">
                {{ ch.hint }}
              </p>
            </div>
          </div>

          <template v-if="ch.id === 'telegram'">
            <label class="field">
              <span class="field-label">Bot token</span>
              <input
                v-model="secrets.telegramToken"
                class="input"
                type="password"
                placeholder="123456:AA..."
              >
            </label>
            <label class="field">
              <span class="field-label">chat_id чата рассылки</span>
              <input
                v-model="secrets.telegramChatId"
                class="input font-mono"
                placeholder="-100…"
              >
            </label>
          </template>
          <template v-else-if="ch.id === 'max'">
            <label class="field">
              <span class="field-label">MAX bot token</span>
              <input
                v-model="secrets.maxToken"
                class="input"
                type="password"
                placeholder="токен бота MAX"
              >
            </label>
            <label class="field">
              <span class="field-label">ID чата рассылки</span>
              <input
                v-model="secrets.maxChatId"
                class="input font-mono"
                placeholder="id чата местности"
              >
            </label>
          </template>
          <template v-else>
            <label class="field">
              <span class="field-label">idInstance</span>
              <input
                v-model="secrets.greenId"
                class="input"
                placeholder="1101..."
              >
            </label>
            <label class="field">
              <span class="field-label">apiTokenInstance</span>
              <input
                v-model="secrets.greenToken"
                class="input"
                type="password"
                placeholder="токен инстанса"
              >
            </label>
            <label class="field">
              <span class="field-label">ID группы рассылки</span>
              <input
                v-model="secrets.whatsappChatId"
                class="input font-mono"
                placeholder="…@g.us"
              >
            </label>
          </template>

          <button
            type="button"
            class="btn btn-primary btn-sm btn-block"
            @click="save(ch.name)"
          >
            <Save class="size-3.5" />
            Сохранить
          </button>
        </article>
      </div>

      <section>
        <h2 class="font-display mb-3 text-sm font-semibold">
          Что нужно подключить
        </h2>
        <div class="grid gap-3 md:grid-cols-3">
          <div
            v-for="block in needs"
            :key="block.title"
            class="desk-surface rounded-2xl p-4"
          >
            <h3 class="mb-2 text-sm font-semibold text-moss-400">
              {{ block.title }}
            </h3>
            <ul class="flex flex-col gap-1.5">
              <li
                v-for="item in block.items"
                :key="item"
                class="flex gap-2 text-xs text-[var(--desk-muted)]"
              >
                <span class="mt-0.5 text-moss-400">·</span>
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  </PageShell>
</template>
