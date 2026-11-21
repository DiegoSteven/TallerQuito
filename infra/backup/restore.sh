#!/usr/bin/env bash
# Restaura un respaldo.  ⚠ Reemplaza los datos actuales.
# Uso (desde el servidor):
#   docker compose exec backup restore.sh /backups/diarios/taller_2026-11-20_0300.dump
# Si el respaldo viene de la PC del taller, súbalo primero a backups/restaurar/ (ver infra/pc-taller/LEEME.md).
set -euo pipefail

ARCHIVO="${1:?Indique el archivo .dump a restaurar}"
export PGPASSWORD="$POSTGRES_PASSWORD"

read -r -p "Esto reemplaza la base '$POSTGRES_DB' con $ARCHIVO. Escriba SI para continuar: " ok
[ "$ok" = "SI" ] || { echo "Cancelado."; exit 1; }

pg_restore -h "${PGHOST:-postgres}" -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner "$ARCHIVO"
echo "[restore] Listo. Reinicie la API: docker compose restart api"
echo "[restore] Fotos de la landing: están en backups/fotos. Para devolverlas al volumen:"
echo "          docker compose cp backups/fotos/. api:/app/uploads/"
