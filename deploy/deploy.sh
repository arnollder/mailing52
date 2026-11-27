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
  # WA_SKIP_CONNECT=1 локально обязателен; на прод его тащить нельзя — Baileys не поднимется
  tmp_env="$(mktemp)"
  grep -vE '^WA_SKIP_CONNECT=' ./.env > "$tmp_env" || true
  rsync -az -e "ssh ${SSH_OPTS[*]}" "$tmp_env" "$HOST:$REMOTE_APP/.env"
  rm -f "$tmp_env"
  ssh "${SSH_OPTS[@]}" "$HOST" "chmod 600 $REMOTE_APP/.env && chown mailing52:mailing52 $REMOTE_APP/.env 2>/dev/null || chown root:root $REMOTE_APP/.env"
fi

# Сессия WhatsApp живёт ТОЛЬКО на проде. Локальный .wa-auth — другой device; заливка убивает прод.
# Явно: SYNC_WA_AUTH=1 bash deploy/deploy.sh
if [[ "${SYNC_WA_AUTH:-}" == "1" && -d .wa-auth ]]; then
  echo "==> Sync .wa-auth (WhatsApp session) — SYNC_WA_AUTH=1"
  rsync -az --delete -e "ssh ${SSH_OPTS[*]}" ./.wa-auth/ "$HOST:$REMOTE_APP/.wa-auth/"
  ssh "${SSH_OPTS[@]}" "$HOST" "chown -R mailing52:mailing52 $REMOTE_APP/.wa-auth && chmod -R u+rwX,go-rwx $REMOTE_APP/.wa-auth"
else
  echo "==> Skip .wa-auth (прод-сессия неприкосновенна; SYNC_WA_AUTH=1 чтобы залить)"
fi

echo "==> Remote activate"
ssh "${SSH_OPTS[@]}" "$HOST" "bash $REMOTE_APP/deploy/remote-activate.sh"

echo "==> Public check"
curl -sS -o /dev/null -w "https:%{http_code}\n" --connect-timeout 20 "$APP_URL/"
curl -sS --connect-timeout 20 "$APP_URL/api/health" || true
echo

echo "Deploy OK → $APP_URL"
