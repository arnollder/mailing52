# Digital М52 — рассылка

Операторская админка рассылки местности: Telegram, MAX, WhatsApp — по одному общему чату на канал.

**Стек:** Vue 3 + Vite + Vue Router + Tailwind CSS 4.

## Dev

```bash
pnpm install
pnpm dev
```

Откроется http://localhost:3052

## Build / deploy

```bash
pnpm build
bash deploy/deploy.sh
```

Прод: статика в `/opt/mailing52/dist`, nginx → https://arnolder.ru
