<script setup lang="ts">
import { channelMeta, urgentHistory, type Channel } from '~/utils/mock'

const toast = useToast()
const text = ref('')
const sending = ref(false)
const channels = ref<Channel[]>(['telegram', 'max', 'whatsapp'])
const confirmOpen = ref(false)

const channelOptions = [
  { label: 'Telegram', value: 'telegram', description: 'чат рассылки М52' },
  { label: 'MAX', value: 'max', description: 'чат рассылки · ждёт ключ' },
  { label: 'WhatsApp', value: 'whatsapp', description: 'чат рассылки · офлайн' }
]

const charCount = computed(() => text.value.length)
const canSend = computed(() => text.value.trim().length >= 5 && channels.value.length > 0)

async function sendNow() {
  if (!canSend.value) return
  sending.value = true
  confirmOpen.value = false
  await new Promise(r => setTimeout(r, 600))
  toast.add({
    title: 'Срочное ушло в чаты',
    description: channels.value.map(c => channelMeta[c].label).join(', '),
    color: 'success',
    icon: 'i-lucide-megaphone'
  })
  text.value = ''
  sending.value = false
}
</script>

<template>
  <UDashboardPanel id="urgent">
    <template #header>
      <UDashboardNavbar title="Срочное">
        <template #leading>
          <UDashboardSidebarToggle />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="desk-page-enter p-4 sm:p-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr] max-w-5xl">
        <section class="rounded-2xl border border-error/25 bg-error/8 p-5 sm:p-6">
          <div class="flex items-center gap-2 mb-1">
            <UIcon
              name="i-lucide-megaphone"
              class="size-4 text-error"
            />
            <h2 class="font-display font-semibold">
              Мгновенная рассылка
            </h2>
          </div>
          <p class="text-sm text-[var(--desk-muted)] mb-4 leading-relaxed">
            Текст сразу в общие чаты рассылки местности. Без очереди. Отменить нельзя — глянь ещё раз.
          </p>

          <UFormField
            label="Текст"
            required
            class="mb-4"
          >
            <UTextarea
              v-model="text"
              :rows="6"
              autoresize
              placeholder="Собрание группы «Антей» сегодня перенесено на 20:00…"
              class="w-full"
            />
            <template #hint>
              {{ charCount }} символов
            </template>
          </UFormField>

          <UFormField
            label="Куда слать"
            class="mb-5"
          >
            <UCheckboxGroup
              v-model="channels"
              :items="channelOptions"
              variant="card"
              indicator="end"
            />
          </UFormField>

          <div class="flex flex-wrap items-center gap-3">
            <UButton
              color="error"
              icon="i-lucide-megaphone"
              label="Отправить сейчас"
              class="rounded-xl"
              :loading="sending"
              :disabled="!canSend"
              @click="confirmOpen = true"
            />
            <p class="text-xs text-[var(--desk-muted)] max-w-xs">
              Уйдёт в выбранные каналы (по одному чату на местность).
            </p>
          </div>
        </section>

        <section>
          <h2 class="font-display font-semibold mb-3">
            История
          </h2>
          <ul class="flex flex-col gap-2.5">
            <li
              v-for="msg in urgentHistory"
              :key="msg.id"
              class="desk-surface rounded-2xl px-4 py-3.5"
            >
              <div class="flex items-center gap-2 mb-1.5">
                <span
                  class="text-[11px] font-semibold uppercase tracking-wide"
                  :class="msg.status === 'sent' ? 'text-primary' : msg.status === 'failed' ? 'text-error' : 'text-warning'"
                >
                  {{ msg.status === 'sent' ? 'доставлено' : msg.status === 'failed' ? 'ошибка' : 'в очереди' }}
                </span>
                <span class="text-[11px] text-[var(--desk-muted)] ms-auto">
                  {{ msg.createdAt }}
                </span>
              </div>
              <p class="text-sm mb-2 leading-snug">
                {{ msg.text }}
              </p>
              <div class="flex items-center justify-between gap-2">
                <div class="flex flex-wrap gap-1">
                  <UBadge
                    v-for="c in msg.channels"
                    :key="c"
                    :icon="channelMeta[c].icon"
                    color="neutral"
                    variant="subtle"
                    size="sm"
                  >
                    {{ channelMeta[c].label }}
                  </UBadge>
                </div>
                <span class="text-[11px] text-[var(--desk-muted)] tabular-nums">
                  {{ msg.delivered }}/{{ msg.total }}
                </span>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <UModal v-model:open="confirmOpen">
        <template #content>
          <UCard :ui="{ root: 'rounded-2xl bg-[var(--desk-surface)]' }">
            <template #header>
              <h3 class="font-display font-semibold">
                Точно отправить?
              </h3>
            </template>
            <p class="text-sm text-[var(--desk-muted)] mb-3">
              Уйдёт в {{ channels.length }} чат(а) рассылки местности.
            </p>
            <blockquote class="rounded-xl border border-[var(--desk-line)] bg-[var(--desk-elevated)] px-3 py-2.5 text-sm">
              {{ text }}
            </blockquote>
            <template #footer>
              <div class="flex justify-end gap-2">
                <UButton
                  label="Назад"
                  color="neutral"
                  variant="ghost"
                  class="rounded-xl"
                  @click="confirmOpen = false"
                />
                <UButton
                  color="error"
                  label="Да, отправить"
                  icon="i-lucide-megaphone"
                  class="rounded-xl"
                  :loading="sending"
                  @click="sendNow"
                />
              </div>
            </template>
          </UCard>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
