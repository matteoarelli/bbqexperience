#!/bin/bash
# setup-umami.sh — Installa Umami analytics sul server Hetzner
set -e

echo "1/4 Creo directory e docker-compose per Umami..."
mkdir -p /opt/services/umami

cat > /opt/services/umami/docker-compose.yml << 'COMPOSE'
version: '3.8'
services:
  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest
    container_name: umami
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://umami:umami_secure_pwd_2026@umami-db:5432/umami
    depends_on:
      - umami-db
    networks:
      - umami-net

  umami-db:
    image: postgres:16-alpine
    container_name: umami-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: umami_secure_pwd_2026
    volumes:
      - umami_pgdata:/var/lib/postgresql/data
    networks:
      - umami-net

volumes:
  umami_pgdata:

networks:
  umami-net:
COMPOSE

echo "2/4 Avvio container Umami..."
cd /opt/services/umami && docker compose up -d

echo "3/4 Aggiungo Umami al Caddyfile..."
if ! grep -q "analytics.bbq-experience.com" /opt/services/caddy/Caddyfile; then
  cat >> /opt/services/caddy/Caddyfile << 'CADDY'

analytics.bbq-experience.com {
    reverse_proxy localhost:3000
}
CADDY
  echo "Caddyfile aggiornato"
else
  echo "Caddyfile gia configurato per analytics"
fi

echo "4/4 Reload Caddy..."
docker exec caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || echo "Caddy reload manuale necessario"

echo ""
echo "Umami installato! Accedi a https://analytics.bbq-experience.com"
echo "Credenziali default: admin / umami"
echo "CAMBIA LA PASSWORD AL PRIMO ACCESSO"
