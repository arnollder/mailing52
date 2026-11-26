#!/usr/bin/env bash
# Запускается на VPS после rsync. Статика Vue SPA на arnolder.ru.
set -euo pipefail

APP=/opt/mailing52
DOMAIN=arnolder.ru

mkdir -p "$APP/dist" /var/www/html

# Старый Nuxt/Node и Arnolder Stack больше не нужны
if systemctl list-unit-files | grep -q '^mailing52.service'; then
  systemctl disable --now mailing52 2>/dev/null || true
fi
if systemctl list-unit-files | grep -q '^arnolder.service'; then
  systemctl disable --now arnolder 2>/dev/null || true
fi
fuser -k 3012/tcp 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true

# Корень arnolder.ru → статика mailing52
cp "$APP/deploy/nginx-arnolder.conf" /etc/nginx/sites-available/arnolder
ln -sfn /etc/nginx/sites-available/arnolder /etc/nginx/sites-enabled/arnolder
rm -f /etc/nginx/sites-enabled/default

# Старый сабдомен → редирект на корень
if [[ -f /etc/letsencrypt/live/arnolder.ru/fullchain.pem ]]; then
  cp "$APP/deploy/nginx-mailing52-redirect.conf" /etc/nginx/sites-available/mailing52
  ln -sfn /etc/nginx/sites-available/mailing52 /etc/nginx/sites-enabled/mailing52
fi

nginx -t
systemctl reload nginx

test -f "$APP/dist/index.html"
echo "OK: mailing52 static → https://${DOMAIN} (node stopped)"
