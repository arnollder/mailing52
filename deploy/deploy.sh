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

echo "==> Sync deploy scripts → $HOST:$REMOTE_APP/deploy"
rsync -az --delete \
  -e "ssh ${SSH_OPTS[*]}" \
  ./deploy/ "$HOST:$REMOTE_APP/deploy/"

if [[ -f .env ]]; then
  echo "==> Sync .env (secrets)"
  rsync -az -e "ssh ${SSH_OPTS[*]}" ./.env "$HOST:$REMOTE_APP/.env"
  ssh "${SSH_OPTS[@]}" "$HOST" "chmod 600 $REMOTE_APP/.env && chown mailing52:mailing52 $REMOTE_APP/.env 2>/dev/null || chown root:root $REMOTE_APP/.env"
fi

echo "==> Remote activate"
ssh "${SSH_OPTS[@]}" "$HOST" "bash $REMOTE_APP/deploy/remote-activate.sh"

echo "==> Public check"
curl -sS -o /dev/null -w "https:%{http_code}\n" --connect-timeout 20 "$APP_URL/"
curl -sS --connect-timeout 20 "$APP_URL/api/health" || true
echo

echo "Deploy OK → $APP_URL"
