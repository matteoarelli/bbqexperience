#!/bin/bash
# restore-db.sh — Ripristina database PostgreSQL da un backup
set -eo pipefail

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

echo "1/5 Verifica integrita backup..."
if ! gunzip -t "$BACKUP_FILE" 2>/dev/null; then
  echo "ERRORE: Il file di backup e corrotto o non valido."
  exit 1
fi

echo "2/5 Fermo Strapi..."
docker stop "$STRAPI_CONTAINER" 2>/dev/null || true

echo "3/5 Rinomino database esistente come safety net..."
docker exec "$CONTAINER" psql -U bbqexperience -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'bbqexperience' AND pid <> pg_backend_pid();" 2>/dev/null || true
docker exec "$CONTAINER" psql -U bbqexperience -d postgres -c "DROP DATABASE IF EXISTS bbqexperience_pre_restore;" 2>/dev/null || true
if ! docker exec "$CONTAINER" psql -U bbqexperience -d postgres -c "ALTER DATABASE bbqexperience RENAME TO bbqexperience_pre_restore;"; then
  echo "ERRORE: Impossibile rinominare il database corrente. Riavvio Strapi..."
  docker start "$STRAPI_CONTAINER" 2>/dev/null || true
  exit 1
fi
if ! docker exec "$CONTAINER" psql -U bbqexperience -d postgres -c "CREATE DATABASE bbqexperience OWNER bbqexperience;"; then
  echo "ERRORE: Impossibile creare nuovo database. Rollback..."
  docker exec "$CONTAINER" psql -U bbqexperience -d postgres -c "ALTER DATABASE bbqexperience_pre_restore RENAME TO bbqexperience;"
  docker start "$STRAPI_CONTAINER" 2>/dev/null || true
  exit 1
fi

echo "4/5 Ripristino da backup..."
if ! gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U bbqexperience -d bbqexperience; then
  echo "ERRORE: Ripristino fallito! Rollback al database precedente..."
  docker exec "$CONTAINER" psql -U bbqexperience -d postgres -c "DROP DATABASE IF EXISTS bbqexperience;"
  docker exec "$CONTAINER" psql -U bbqexperience -d postgres -c "ALTER DATABASE bbqexperience_pre_restore RENAME TO bbqexperience;"
  docker start "$STRAPI_CONTAINER"
  echo "Rollback completato. Il database originale e stato ripristinato."
  exit 1
fi

echo "5/5 Riavvio Strapi e pulizia..."
docker start "$STRAPI_CONTAINER"
echo "Ripristino completato. Il vecchio database e salvato come 'bbqexperience_pre_restore'."
echo "Per eliminarlo: docker exec $CONTAINER psql -U bbqexperience -d postgres -c \"DROP DATABASE bbqexperience_pre_restore;\""
echo "Verifica: https://cms.bbq-experience.com/admin"
