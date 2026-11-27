#!/usr/bin/env bash
# Deploy mailing52 (Vue SPA + API) to arnolder.ru
# Usage: bash deploy/deploy.sh
set -euo pipefail

HOST="${DEPLOY_HOST:-root@88.218.171.254}"
REMOTE_APP="/opt/mailing52"
APP_URL="${APP_URL:-https://arnolder.ru}"
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new)

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "${SKIP_BUILD:-}" != "1" ]]; then
  echo "==> Building locally ..."
  NODE_OPTIONS=--max-old-space-size=4096 pnpm build
fi

echo "==> Sync dist → $HOST:$REMOTE_APP/dist"
ssh "${SSH_OPTS[@]}" "$HOST" "mkdir -p $REMOTE_APP/dist $REMOTE_APP/deploy $REMOTE_APP/server"
rsync -az --delete \
  -e "ssh ${SSH_OPTS[*]}" \
  ./dist/ "$HOST:$REMOTE_APP/dist/"

echo "==> Sync server → $HOST:$REMOTE_APP/server"
rsync -az --delete \
  -e "ssh ${SSH_OPTS[*]}" \
  ./server/ "$HOST:$REMOTE_APP/server/"

echo "==> Sync package manifests (API deps: Baileys)"
rsync -az -e "ssh ${SSH_OPTS[*]}" \
  ./package.json ./pnpm-lock.yaml ./pnpm-workspace.yaml \
  "$HOST:$REMOTE_APP/"

echo "==> Sync deploy scripts → $HOST:$REMOTE_APP/deploy"
rsync -az --delete \
  -e "ssh ${SSH_OPTS[*]}" \
  ./deploy/ "$HOST:$REMOTE_APP/deploy/"

if [[ -f .env ]]; then
  echo "==> Sync .env (secrets)"
  # Локальные флаги/пути не тащим на прод — иначе Baileys не поднимется или возьмёт не тот auth
  tmp_env="$(mktemp)"
  grep -vE '^(WA_SKIP_CONNECT|WA_ALLOW_CONNECT|WA_PROFILE|WA_AUTH_DIR|WA_AUTH_DIR_LOCAL|WA_DEVICE_NAME)=' ./.env > "$tmp_env" || true
  {
    echo "WA_PROFILE=prod"
    echo "WA_AUTH_DIR=.wa-auth"
  } >> "$tmp_env"
  rsync -az -e "ssh ${SSH_OPTS[*]}" "$tmp_env" "$HOST:$REMOTE_APP/.env"
  rm -f "$tmp_env"
  ssh "${SSH_OPTS[@]}" "$HOST" "chmod 600 $REMOTE_APP/.env && chown mailing52:mailing52 $REMOTE_APP/.env 2>/dev/null || chown root:root $REMOTE_APP/.env"
fi

# Прод-сессия неприкосновенна. Локальный .wa-auth-local / чужой QR сюда не лей.
# Аварийно: SYNC_WA_AUTH=1 I_KNOW_WA_AUTH_OVERWRITE=1 bash deploy/deploy.sh
if [[ "${SYNC_WA_AUTH:-}" == "1" ]]; then
  if [[ "${I_KNOW_WA_AUTH_OVERWRITE:-}" != "1" ]]; then
    echo "ERROR: SYNC_WA_AUTH=1 без I_KNOW_WA_AUTH_OVERWRITE=1 — отказ (убило бы прод-сессию)"
    exit 1
  fi
  if [[ ! -d .wa-auth ]]; then
    echo "ERROR: нет ./.wa-auth для заливки"
    exit 1
  fi
  echo "==> Sync .wa-auth → прод (ОПАСНО, ты подтвердил I_KNOW_WA_AUTH_OVERWRITE=1)"
  rsync -az --delete -e "ssh ${SSH_OPTS[*]}" ./.wa-auth/ "$HOST:$REMOTE_APP/.wa-auth/"
  ssh "${SSH_OPTS[@]}" "$HOST" "chown -R mailing52:mailing52 $REMOTE_APP/.wa-auth && chmod -R u+rwX,go-rwx $REMOTE_APP/.wa-auth"
else
  echo "==> Skip .wa-auth / .wa-auth-local (прод-сессия неприкосновенна)"
fi

echo "==> Remote activate"
ssh "${SSH_OPTS[@]}" "$HOST" "bash $REMOTE_APP/deploy/remote-activate.sh"

echo "==> Public check"
curl -sS -o /dev/null -w "https:%{http_code}\n" --connect-timeout 20 "$APP_URL/"
curl -sS --connect-timeout 20 "$APP_URL/api/health" || true
echo

echo "Deploy OK → $APP_URL"
