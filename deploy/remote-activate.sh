#!/usr/bin/env bash
# Статика + API рассылки на arnolder.ru
set -euo pipefail

APP=/opt/mailing52
DOMAIN=arnolder.ru
PORT=3012

id mailing52 &>/dev/null || useradd --system --home "$APP" --shell /usr/sbin/nologin mailing52

mkdir -p "$APP/dist" "$APP/server" /var/www/html

if systemctl list-unit-files | grep -q '^arnolder.service'; then
  systemctl disable --now arnolder 2>/dev/null || true
fi
# старый Nuxt unit
if systemctl list-unit-files | grep -q '^mailing52.service'; then
  systemctl disable --now mailing52 2>/dev/null || true
fi
fuser -k 3000/tcp 2>/dev/null || true

chown -R mailing52:mailing52 "$APP"
chmod 600 "$APP/.env" 2>/dev/null || true
mkdir -p "$APP/.wa-auth"
chown -R mailing52:mailing52 "$APP/.wa-auth"
chmod -R u+rwX,go-rwx "$APP/.wa-auth"

# Runtime deps для API (Baileys). Vue/dev на сервере не нужны — omit=dev.
if [[ -f "$APP/package.json" ]]; then
  echo "==> npm install --omit=dev (API)"
  cd "$APP"
  # packageManager=pnpm в package.json — npm всё равно ставит node_modules
  npm install --omit=dev --no-fund --no-audit
  chown -R mailing52:mailing52 "$APP/node_modules"
fi

cp "$APP/deploy/mailing52-api.service" /etc/systemd/system/mailing52-api.service
systemctl daemon-reload
systemctl enable mailing52-api
systemctl restart mailing52-api
sleep 2
systemctl is-active mailing52-api
curl -sf "http://127.0.0.1:${PORT}/api/health" || true
echo
# WhatsApp status (если Baileys поднялся)
curl -sf "http://127.0.0.1:${PORT}/api/wa/status" || true
echo

cp "$APP/deploy/nginx-arnolder.conf" /etc/nginx/sites-available/arnolder
ln -sfn /etc/nginx/sites-available/arnolder /etc/nginx/sites-enabled/arnolder
rm -f /etc/nginx/sites-enabled/default

if [[ -f /etc/letsencrypt/live/arnolder.ru/fullchain.pem ]]; then
  cp "$APP/deploy/nginx-mailing52-redirect.conf" /etc/nginx/sites-available/mailing52
  ln -sfn /etc/nginx/sites-available/mailing52 /etc/nginx/sites-enabled/mailing52
fi

nginx -t
systemctl reload nginx

test -f "$APP/dist/index.html"
echo "OK: static + api :${PORT} → https://${DOMAIN}"
