#!/usr/bin/env bash
# Deploy mailing52 to arnolder.ru (заменяет старый лендинг)
# Usage: bash deploy/deploy.sh
set -euo pipefail

HOST="${DEPLOY_HOST:-root@88.218.171.254}"
REMOTE_APP="/opt/mailing52"
APP_URL="${NUXT_PUBLIC_SITE_URL:-https://arnolder.ru}"
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new)

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "${SKIP_BUILD:-}" != "1" ]]; then
  echo "==> Building locally for $APP_URL ..."
  NUXT_PUBLIC_SITE_URL="$APP_URL" \
  NODE_OPTIONS=--max-old-space-size=4096 \
  pnpm build
fi

echo "==> Sync .output → $HOST:$REMOTE_APP/.output"
ssh "${SSH_OPTS[@]}" "$HOST" "mkdir -p $REMOTE_APP/.output $REMOTE_APP/deploy"
rsync -az --delete \
  -e "ssh ${SSH_OPTS[*]}" \
  ./.output/ "$HOST:$REMOTE_APP/.output/"

echo "==> Sync deploy scripts → $HOST:$REMOTE_APP/deploy"
rsync -az --delete \
  -e "ssh ${SSH_OPTS[*]}" \
  ./deploy/ "$HOST:$REMOTE_APP/deploy/"

echo "==> Remote activate (kill arnolder landing, take arnolder.ru)"
ssh "${SSH_OPTS[@]}" "$HOST" "bash $REMOTE_APP/deploy/remote-activate.sh"

echo "==> Public check"
curl -sS -o /dev/null -w "https:%{http_code} title-check\n" --connect-timeout 20 "$APP_URL/"
TITLE="$(curl -sS --connect-timeout 20 "$APP_URL/" | tr '\n' ' ' | sed -n 's/.*<title>\([^<]*\)<\/title>.*/\1/p')"
echo "title: ${TITLE:-unknown}"

echo "Deploy OK → $APP_URL"
