# Digital М52 — рассылка

Операторская админка рассылки местности: Telegram, MAX, WhatsApp — по одному общему чату на канал.

**Стек:** Vue 3 + Vite + Vue Router + Tailwind CSS 4 · API Node (MAX / TG / Baileys).

## Dev

```bash
pnpm install
pnpm dev          # UI :3052
pnpm api          # API :3012 — локально WA по умолчанию skip
```

### WhatsApp Baileys — сессии

| Где | Auth dir | Device name |
|-----|----------|-------------|
| Прод (`arnolder.ru`) | `.wa-auth` | `mailing52` |
| Этот ПК | `.wa-auth-local` | `mailing52-dev` |
| Другой ПК | свой каталог | свой QR |

**Не копируй** папку auth между машинами — WhatsApp выкинет другие устройства.

```bash
pnpm wa:login          # QR → третья сессия в .wa-auth-local (прод не трогает)
# в .env: WA_GROUP_JID=xxxx@g.us
pnpm wa:send "тест"    # шлёт с локальной сессии (если ALLOW)
```

Локальный `pnpm api` сам не коннектится к WA (`skip`), пока не `WA_ALLOW_CONNECT=1`. Срочные в прод-группу — с https://arnolder.ru.

### Доступ

Аутентификации в UI пока нет: считаем, что доступ уже есть (для разработки/теста).  
Позже — basic auth / логин; токены мессенджеров по-прежнему только в `.env` на сервере, служащим их не показывают.

### Расписание → мессенджеры

Каждый день **06:00 Europe/Moscow** API собирает дайджест на сегодня и шлёт в TG/MAX/WA.

- Источник: `na-russia.org` (locality `45` = МКО Местность52) + online-группы с `аннн.рф`
- Ссылки в посте: `https://аннн.рф/groups/{slug}`
- Формат: `🔷Расписание собраний🔷` + день + строки `HH:MM - Имя (url) - место`
- UI → **Расписание**: превью + **Отправить сейчас** (если авто затупило)
- `GET /api/schedule/preview`, `GET /api/schedule/status`, `POST /api/schedule/send`
- `SCHEDULE_DRY_RUN=1` — не слать в чаты, только статус
- `SCHEDULE_CRON_DISABLE=1` — выключить крон

## Build / deploy

```bash
pnpm build
bash deploy/deploy.sh
```

Прод: статика + API, nginx → https://arnolder.ru  
`.wa-auth` на сервер **не заливается** (нужны оба флага: `SYNC_WA_AUTH=1 I_KNOW_WA_AUTH_OVERWRITE=1`).
