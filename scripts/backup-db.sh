#!/bin/bash
# backup-db.sh — Backup giornaliero PostgreSQL per BBQ Experience
set -e

BACKUP_DIR="/opt/backups/bbqexperience"
LOG="/opt/webhooks/logs/backup.log"
DATE=$(date '+%Y-%m-%d')
FILENAME="bbqexperience_${DATE}.sql.gz"
CONTAINER="bbqexperience-postgres"

mkdir -p "$BACKUP_DIR"

echo "$(date '+%Y-%m-%d %H:%M:%S') -- Backup iniziato" >> "$LOG"

if docker exec "$CONTAINER" pg_dump -U bbqexperience -d bbqexperience | gzip > "${BACKUP_DIR}/${FILENAME}"; then
  FILE_SIZE=$(stat -c%s "${BACKUP_DIR}/${FILENAME}" 2>/dev/null || echo 0)
  if [ "$FILE_SIZE" -lt 100 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') -- ERRORE: Backup troppo piccolo (${FILE_SIZE} bytes), possibile dump vuoto" >> "$LOG"
    rm -f "${BACKUP_DIR}/${FILENAME}"
    exit 1
  fi
  echo "$(date '+%Y-%m-%d %H:%M:%S') -- Backup completato: ${FILENAME} (${FILE_SIZE} bytes)" >> "$LOG"
else
  echo "$(date '+%Y-%m-%d %H:%M:%S') -- ERRORE: pg_dump fallito" >> "$LOG"
  exit 1
fi

find "$BACKUP_DIR" -name "bbqexperience_*.sql.gz" -mtime +30 -delete
REMAINING=$(ls -1 "$BACKUP_DIR"/bbqexperience_*.sql.gz 2>/dev/null | wc -l)
echo "$(date '+%Y-%m-%d %H:%M:%S') -- Pulizia completata, ${REMAINING} backup conservati" >> "$LOG"
