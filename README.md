# Digital М52 — рассылка

Операторская админка рассылки местности: Telegram, MAX, WhatsApp — по одному общему чату на канал.

**Стек:** Vue 3 + Vite + Vue Router + Tailwind CSS 4.

## Dev

```bash
pnpm install
pnpm dev
```

Откроется http://localhost:3052

API (отдельно): `pnpm api` → http://127.0.0.1:3012

### WhatsApp Baileys (ветка `feat/whatsapp-baileys`, локально)

```bash
pnpm wa:login          # QR в терминале → список групп
# в .env: WA_GROUP_JID=xxxx@g.us
pnpm wa:send "тест"    # прямая отправка
pnpm api               # /api/urgent с channels:["whatsapp"]
```

Сессия в `.wa-auth/` (в git не попадает). На main/прод пока не деплоим.

## Build / deploy

```bash
pnpm build
bash deploy/deploy.sh
```

Прод: статика в `/opt/mailing52/dist`, nginx → https://arnolder.ru
