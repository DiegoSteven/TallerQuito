#!/usr/bin/env bash
# Respaldo de la base de datos.
#   Local:  /backups/{diarios,semanales,mensuales}
#   Remoto: $BACKUP_REMOTE (rclone, tipo "crypt" → los archivos viajan cifrados)
# Retención: 7 diarios · 4 semanales (domingos) · 12 mensuales (día 1).
set -euo pipefail

DIR=/backups
FECHA=$(date +%Y-%m-%d_%H%M)
ARCHIVO="taller_${FECHA}.dump"
export PGPASSWORD="$POSTGRES_PASSWORD"

mkdir -p "$DIR"/{diarios,semanales,mensuales}

echo "[backup] $(date '+%F %T') Iniciando pg_dump…"
pg_dump -h "${PGHOST:-postgres}" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -Z 9 -f "$DIR/diarios/$ARCHIVO"

# Verifica que el archivo se pueda leer (un respaldo que no se puede restaurar no sirve).
pg_restore --list "$DIR/diarios/$ARCHIVO" > /dev/null
echo "[backup] OK: $ARCHIVO ($(du -h "$DIR/diarios/$ARCHIVO" | cut -f1))"

if [ "$(date +%u)" = "7" ]; then cp "$DIR/diarios/$ARCHIVO" "$DIR/semanales/"; fi
if [ "$(date +%d)" = "01" ]; then cp "$DIR/diarios/$ARCHIVO" "$DIR/mensuales/"; fi

# Deja solo los N más recientes. Con la carpeta vacía no hace nada
# (sin esto, `ls` falla por pipefail y el script se corta antes de la copia remota).
limpiar() {
  local archivos
  archivos=$(ls -1t "$1"/*.dump 2>/dev/null || true)
  [ -z "$archivos" ] || echo "$archivos" | tail -n +"$(($2 + 1))" | xargs -r rm -f
}
limpiar "$DIR/diarios" 7
limpiar "$DIR/semanales" 4
limpiar "$DIR/mensuales" 12

if [ -n "${BACKUP_REMOTE:-}" ] && [ -f /config/rclone/rclone.conf ]; then
  rclone --config /config/rclone/rclone.conf sync "$DIR" "$BACKUP_REMOTE" --log-level NOTICE
  echo "[backup] Copia remota sincronizada en $BACKUP_REMOTE"
else
  echo "[backup] ⚠ Sin copia remota: configure BACKUP_REMOTE e infra/backup/rclone.conf"
fi
