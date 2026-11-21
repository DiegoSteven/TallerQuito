#!/usr/bin/env bash
# Respaldo de la base de datos (cada 6 h por cron, y antes de cada despliegue).
#   Local:  /backups/{diarios,semanales,mensuales}
#   Copia externa: la PC del taller los descarga por SFTP (solo lectura) 3 veces al día
#   (infra/pc-taller/). No se usa ningún servicio en la nube.
# Retención: 28 recientes (≈ 7 días a 4 por día) · 4 semanales (domingo) · 12 mensuales (día 1).
# Uso: backup.sh [etiqueta]   p. ej.  backup.sh antes-de-desplegar
set -euo pipefail

DIR=/backups
HOY=$(date +%Y-%m-%d)
FECHA="${HOY}_$(date +%H%M)"
ETIQUETA="${1:+_$1}"
ARCHIVO="taller_${FECHA}${ETIQUETA}.dump"
export PGPASSWORD="$POSTGRES_PASSWORD"

mkdir -p "$DIR"/{diarios,semanales,mensuales}

echo "[backup] $(date '+%F %T') Iniciando pg_dump…"
pg_dump -h "${PGHOST:-postgres}" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -Z 9 -f "$DIR/diarios/$ARCHIVO"

# Verifica que el archivo se pueda leer (un respaldo que no se puede restaurar no sirve).
pg_restore --list "$DIR/diarios/$ARCHIVO" > /dev/null
echo "[backup] OK: $ARCHIVO ($(du -h "$DIR/diarios/$ARCHIVO" | cut -f1))"

# Semanal y mensual: solo el primer respaldo de ese día (ahora corre varias veces al día).
ya_hay_de_hoy() { ls "$1"/taller_"$HOY"_*.dump >/dev/null 2>&1; }
if [ "$(date +%u)" = "7" ] && ! ya_hay_de_hoy "$DIR/semanales"; then cp "$DIR/diarios/$ARCHIVO" "$DIR/semanales/"; fi
if [ "$(date +%d)" = "01" ] && ! ya_hay_de_hoy "$DIR/mensuales"; then cp "$DIR/diarios/$ARCHIVO" "$DIR/mensuales/"; fi

# Deja solo los N más recientes. Con la carpeta vacía no hace nada
# (sin esto, `ls` falla por pipefail y el script se corta antes de la copia remota).
limpiar() {
  local archivos
  archivos=$(ls -1t "$1"/*.dump 2>/dev/null || true)
  [ -z "$archivos" ] || echo "$archivos" | tail -n +"$(($2 + 1))" | xargs -r rm -f
}
limpiar "$DIR/diarios" 28
limpiar "$DIR/semanales" 4
limpiar "$DIR/mensuales" 12

# Fotos de la landing: copia espejo en $DIR/fotos (solo agrega o actualiza; la PC del taller también las descarga)
if [ -d /uploads ]; then
  mkdir -p "$DIR/fotos"
  cp -au /uploads/. "$DIR/fotos/"
  echo "[backup] Fotos copiadas: $(find "$DIR/fotos" -type f | wc -l) archivo(s)"
fi

echo "[backup] Listo. Respaldos guardados: $(find "$DIR" -name '*.dump' | wc -l) · ocupan $(du -sh "$DIR" | cut -f1)"
