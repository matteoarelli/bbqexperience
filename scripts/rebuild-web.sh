#!/bin/bash
# rebuild-web.sh — Ricostruisce il sito statico Astro
# Chiamato sia dal deploy (git push) sia dal webhook Strapi (content change)
# Include debounce con lockfile per evitare rebuild multipli simultanei
set -e

LOCK="/tmp/bbqexperience-rebuild.lock"
LOG="/opt/webhooks/logs/bbqexperience.log"
WEB_DIR="/opt/services/bbqexperience/app/web"
OUTPUT_DIR="/opt/services/bbqexperience/dist"

# Controlla se un rebuild e' gia' in corso
if [ -f "$LOCK" ]; then
  LOCK_AGE=$(($(date +%s) - $(stat -c %Y "$LOCK" 2>/dev/null || echo 0)))
  if [ "$LOCK_AGE" -lt 300 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') -- Rebuild gia' in corso, skip" >> "$LOG"
    exit 0
  fi
  # Lockfile vecchio (>5 min), probabilmente crash — rimuovi
  rm -f "$LOCK"
fi

trap "rm -f $LOCK" EXIT
echo $$ > "$LOCK"

echo "$(date '+%Y-%m-%d %H:%M:%S') -- Rebuild web iniziato" >> "$LOG"

cd "$WEB_DIR"

# Build Astro dentro container Docker (il server non ha Node.js installato)
docker run --rm \
  -v "$WEB_DIR":/app \
  -v bbqexperience_web_modules:/app/node_modules \
  -w /app \
  -e STRAPI_URL=http://host.docker.internal:1337 \
  node:22-alpine sh -c "npm ci --production=false 2>&1 | tail -3 && npm run build 2>&1 | tail -5"

# Copia output nella directory servita da Caddy
rm -rf "${OUTPUT_DIR}.old"
[ -d "$OUTPUT_DIR" ] && mv "$OUTPUT_DIR" "${OUTPUT_DIR}.old"
cp -r "$WEB_DIR/dist" "$OUTPUT_DIR"

echo "$(date '+%Y-%m-%d %H:%M:%S') -- Rebuild web completato" >> "$LOG"
