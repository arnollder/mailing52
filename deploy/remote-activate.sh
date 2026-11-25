#!/usr/bin/env bash
# Запускается на VPS после rsync. Вешает mailing52 на arnolder.ru, гасит старый лендинг.
set -euo pipefail

APP=/opt/mailing52
DOMAIN=arnolder.ru
PORT=3012

id mailing52 &>/dev/null || useradd --system --home "$APP" --shell /usr/sbin/nologin mailing52

mkdir -p "$APP/.output" /var/www/html

# Останавливаем старый Arnolder Stack на :3000
if systemctl list-unit-files | grep -q '^arnolder.service'; then
  systemctl disable --now arnolder 2>/dev/null || true
fi
fuser -k 3000/tcp 2>/dev/null || true

cat > "$APP/.env" <<EOF
NUXT_PUBLIC_SITE_URL=https://${DOMAIN}
HOST=127.0.0.1
PORT=${PORT}
NODE_ENV=production
TZ=Europe/Moscow
EOF
chmod 600 "$APP/.env"

chown -R mailing52:mailing52 "$APP"

cp "$APP/deploy/mailing52.service" /etc/systemd/system/mailing52.service
systemctl daemon-reload
systemctl enable mailing52
systemctl restart mailing52
sleep 2
systemctl is-active mailing52
curl -sf -o /dev/null -w "local:%{http_code}\n" "http://127.0.0.1:${PORT}/"

# Корень arnolder.ru → mailing52
cp "$APP/deploy/nginx-arnolder.conf" /etc/nginx/sites-available/arnolder
ln -sfn /etc/nginx/sites-available/arnolder /etc/nginx/sites-enabled/arnolder
rm -f /etc/nginx/sites-enabled/default

# Старый сабдомен → редирект на корень (если сертификат arnolder.ru есть)
if [[ -f /etc/letsencrypt/live/arnolder.ru/fullchain.pem ]]; then
  cp "$APP/deploy/nginx-mailing52-redirect.conf" /etc/nginx/sites-available/mailing52
  ln -sfn /etc/nginx/sites-available/mailing52 /etc/nginx/sites-enabled/mailing52
fi

nginx -t
systemctl reload nginx

echo "OK: mailing52 on :${PORT} → https://${DOMAIN} (arnolder landing stopped)"
