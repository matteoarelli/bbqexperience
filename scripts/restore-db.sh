#!/bin/bash
# restore-db.sh — Ripristina database PostgreSQL da un backup
set -e

BACKUP_FILE="$1"
CONTAINER="bbqexperience-postgres"
STRAPI_CONTAINER="bbqexperience-strapi"

if [ -z "$BACKUP_FILE" ]; then
  echo "Uso: $0 <percorso-file-backup.sql.gz>"
  echo "Backup disponibili:"
  ls -lh /opt/backups/bbqexperience/bbqexperience_*.sql.gz 2>/dev/null || echo "  Nessun backup trovato"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERRORE: File non trovato: $BACKUP_FILE"
  exit 1
fi

echo "ATTENZIONE: Questo sovrascrivera il database corrente con il backup:"
echo "  $BACKUP_FILE"
echo ""
read -p "Continuare? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Annullato."
  exit 0
fi

echo "1/4 Fermo Strapi..."
docker stop "$STRAPI_CONTAINER" 2>/dev/null || true

echo "2/4 Drop e ricreazione database..."
docker exec "$CONTAINER" psql -U bbqexperience -d postgres -c "DROP DATABASE IF EXISTS bbqexperience;"
docker exec "$CONTAINER" psql -U bbqexperience -d postgres -c "CREATE DATABASE bbqexperience OWNER bbqexperience;"

echo "3/4 Ripristino da backup..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U bbqexperience -d bbqexperience

echo "4/4 Riavvio Strapi..."
docker start "$STRAPI_CONTAINER"

echo "Ripristino completato. Verifica: https://cms.bbq-experience.com/admin"
