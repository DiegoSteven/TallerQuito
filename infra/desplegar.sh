#!/usr/bin/env bash
# Despliega una versión en el VPS. Lo ejecuta GitHub Actions en cada push a main (también se puede a mano).
#
#   Uso:              bash infra/desplegar.sh <tag>       p. ej.  bash infra/desplegar.sh sha-1a2b3c4
#   Volver atrás:     bash infra/desplegar.sh "$(cat .version-anterior)"
#
# Pasos: respaldo previo → descargar imágenes ya construidas (ghcr.io) → levantar → verificar que la API quedó sana.
# El servidor NO compila nada (con 2 GB de RAM, compilar React y Nest aquí sería lento y podría quedarse sin memoria).
set -euo pipefail
cd "$(dirname "$0")/.."

TAG="${1:?Indique la versión, p. ej. sha-1a2b3c4}"
export TAG
anterior="$(cat .version-actual 2>/dev/null || true)"

echo "▶ 1/4 Respaldo previo"
if docker compose ps --status running --services 2>/dev/null | grep -qx backup; then
  docker compose exec -T backup backup.sh antes-de-desplegar
else
  echo "  (primer despliegue: todavía no hay base que respaldar)"
fi

echo "▶ 2/4 Descargando imágenes $TAG"
docker compose pull api caddy backup

echo "▶ 3/4 Levantando (las migraciones de la base se aplican solas al arrancar la API)"
docker compose up -d --remove-orphans

echo "▶ 4/4 Verificando"
estado="?"
for _ in $(seq 1 30); do
  estado="$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q api)" 2>/dev/null || echo '?')"
  [ "$estado" = healthy ] && break
  sleep 4
done
if [ "$estado" != healthy ]; then
  echo "✖ La API no quedó sana (estado: $estado). Últimos registros:"
  docker compose logs --tail 40 api
  if [ -n "$anterior" ]; then
    echo "Para volver a la versión anterior:  bash infra/desplegar.sh $anterior"
    echo "Si una migración dañó datos: restaurar el respaldo 'antes-de-desplegar' con restore.sh (ver README)."
  fi
  exit 1
fi

if [ -n "$anterior" ] && [ "$anterior" != "$TAG" ]; then echo "$anterior" > .version-anterior; fi
echo "$TAG" > .version-actual
docker image prune -f > /dev/null
echo "✔ Versión $TAG en línea."
