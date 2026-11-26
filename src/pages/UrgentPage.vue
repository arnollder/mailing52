<script setup lang="ts">
import { computed, ref } from 'vue'
import { Megaphone } from 'lucide-vue-next'
import PageShell from '@/components/PageShell.vue'
import { useToast } from '@/composables/useToast'
import { channelMeta, urgentHistory, type Channel } from '@/data/mock'

const toast = useToast()
const text = ref('')
const sending = ref(false)
const channels = ref<Channel[]>(['telegram', 'max', 'whatsapp'])
const confirmOpen = ref(false)

const channelOptions: { label: string, value: Channel, description: string }[] = [
  { label: 'Telegram', value: 'telegram', description: 'чат рассылки · ждёт ключ' },
  { label: 'MAX', value: 'max', description: 'чат рассылки · ждёт ключ' },
  { label: 'WhatsApp', value: 'whatsapp', description: 'чат рассылки · офлайн' }
]

const charCount = computed(() => text.value.length)
const canSend = computed(() => text.value.trim().length >= 5 && channels.value.length > 0)

function toggleChannel(c: Channel) {
  const i = channels.value.indexOf(c)
  if (i >= 0) channels.value.splice(i, 1)
  else channels.value.push(c)
}

async function sendNow() {
  if (!canSend.value) return
  sending.value = true
  confirmOpen.value = false
  await new Promise(r => setTimeout(r, 600))
  toast.add({
    title: 'Срочное ушло в чаты',
    description: channels.value.map(c => channelMeta[c].label).join(', '),
    tone: 'success'
  })
  text.value = ''
  sending.value = false
}
</script>

<template>
  <PageShell title="Срочное">
    <div class="desk-page-enter mx-auto grid max-w-5xl gap-5 p-4 sm:p-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section class="rounded-2xl border border-ember-500/25 bg-ember-500/10 p-5 sm:p-6">
        <div class="mb-1 flex items-center gap-2">
          <Megaphone class="size-4 text-ember-400" />
          <h2 class="font-display font-semibold">
            Мгновенная рассылка
          </h2>
        </div>
        <p class="mb-4 text-sm leading-relaxed text-[var(--desk-muted)]">
          Текст сразу в общие чаты рассылки местности. Без очереди. Отменить нельзя — глянь ещё раз.
        </p>

        <label class="field mb-4">
          <span class="field-label">Текст *</span>
          <textarea
            v-model="text"
            class="textarea"
            rows="6"
            placeholder="Собрание группы «Антей» сегодня перенесено на 20:00…"
          />
          <span class="text-xs text-[var(--desk-muted)]">{{ charCount }} символов</span>
        </label>

        <div class="field mb-5">
          <span class="field-label">Куда слать</span>
          <div class="flex flex-col gap-2">
            <label
              v-for="opt in channelOptions"
              :key="opt.value"
              class="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 ring-1 ring-[var(--desk-line)]"
              :class="channels.includes(opt.value) ? 'bg-moss-500/10' : ''"
            >
              <input
                type="checkbox"
                class="mt-1 accent-moss-500"
                :checked="channels.includes(opt.value)"
                @change="toggleChannel(opt.value)"
              >
              <span>
                <span class="block text-sm font-medium">{{ opt.label }}</span>
                <span class="block text-xs text-[var(--desk-muted)]">{{ opt.description }}</span>
              </span>
            </label>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="btn btn-danger"
            :disabled="!canSend || sending"
            @click="confirmOpen = true"
          >
            <Megaphone class="size-4" />
            {{ sending ? 'Отправка…' : 'Отправить сейчас' }}
          </button>
          <p class="max-w-xs text-xs text-[var(--desk-muted)]">
            Уйдёт в выбранные каналы (по одному чату на местность).
          </p>
        </div>
      </section>

      <section>
        <h2 class="font-display mb-3 font-semibold">
          История
        </h2>
        <ul class="flex flex-col gap-2.5">
          <li
            v-for="msg in urgentHistory"
            :key="msg.id"
            class="desk-surface rounded-2xl px-4 py-3.5"
          >
            <div class="mb-1.5 flex items-center gap-2">
              <span
                class="text-[11px] font-semibold uppercase tracking-wide"
                :class="msg.status === 'sent' ? 'text-moss-400' : msg.status === 'failed' ? 'text-ember-400' : 'text-warning'"
              >
                {{ msg.status === 'sent' ? 'доставлено' : msg.status === 'failed' ? 'ошибка' : 'в очереди' }}
              </span>
              <span class="ms-auto text-[11px] text-[var(--desk-muted)]">
                {{ msg.createdAt }}
              </span>
            </div>
            <p class="mb-2 text-sm leading-snug">
              {{ msg.text }}
            </p>
            <div class="flex items-center justify-between gap-2">
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="c in msg.channels"
                  :key="c"
                  class="badge"
                >
                  {{ channelMeta[c].label }}
                </span>
              </div>
              <span class="text-[11px] tabular-nums text-[var(--desk-muted)]">
                {{ msg.delivered }}/{{ msg.total }}
              </span>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <div
      v-if="confirmOpen"
      class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      @click.self="confirmOpen = false"
    >
      <div class="desk-surface w-full max-w-md rounded-2xl p-5">
        <h3 class="font-display mb-3 font-semibold">
          Точно отправить?
        </h3>
        <p class="mb-3 text-sm text-[var(--desk-muted)]">
          Уйдёт в {{ channels.length }} чат(а) рассылки местности.
        </p>
        <blockquote class="rounded-xl border border-[var(--desk-line)] bg-[var(--desk-elevated)] px-3 py-2.5 text-sm">
          {{ text }}
        </blockquote>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="btn btn-ghost"
            @click="confirmOpen = false"
          >
            Назад
          </button>
          <button
            type="button"
            class="btn btn-danger"
            :disabled="sending"
            @click="sendNow"
          >
            <Megaphone class="size-4" />
            Да, отправить
          </button>
        </div>
      </div>
    </div>
  </PageShell>
</template>
