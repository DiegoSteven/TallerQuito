#!/usr/bin/env bash
# Programa el respaldo con cron (BACKUP_CRON, por defecto todos los días a las 03:00).
set -euo pipefail

echo "${BACKUP_CRON:-0 3 * * *} /usr/local/bin/backup.sh >> /proc/1/fd/1 2>&1" > /etc/crontabs/root
echo "[backup] Programado: ${BACKUP_CRON:-0 3 * * *} (zona ${TZ:-UTC})"

# Primer respaldo al arrancar, para comprobar que todo funciona.
/usr/local/bin/backup.sh || echo "[backup] ⚠ El primer respaldo falló; revise la configuración."

exec crond -f -l 8
