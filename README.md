# Mecánica Automotriz Sánchez — Órdenes de trabajo e historial (Fase 1)

Sistema del taller **Mecánica Automotriz Sánchez** (Cumbayá, Quito):

- **Orden de trabajo digital**, igual al talonario en papel: recepción del vehículo (checklist SÍ/NO de 24 ítems, combustible, golpes marcados sobre el dibujo del carro), repuestos y mano de obra, y los 4 hitos (llegada, pedido y llegada de repuestos, entrega).
- **PDF para imprimir y firmar** (cliente y jefe de taller), en una hoja A4, con la cláusula de autorización. Lo que aún no se llenó sale en blanco para completar a mano.
- **Historial**: buscar una placa y saber en segundos qué se le hizo al vehículo, cuándo y a qué kilometraje, con recordatorios del próximo mantenimiento.
- La numeración continúa la del talonario (`NUMERO_ORDEN_INICIAL`).

- Propuesta y alcance: [`docs/Propuesta_Sistema_Historial_Taller.pdf`](docs/Propuesta_Sistema_Historial_Taller.pdf)
- Prototipo navegable: [`docs/prototipo_fase1.html`](docs/prototipo_fase1.html)

## Arquitectura

```
                     Internet (HTTPS)
                            │
┌─────────────────── VPS · Docker Compose ───────────────────┐
│                                                             │
│   caddy :80/:443 ──┬── /api/*  ──►  api (NestJS) ──► postgres│
│   (HTTPS auto)     └── /*      ──►  web (React, estático)    │
│                                                             │
│   backup (cron 03:00) ── pg_dump ──► ./backups ──► R2 (cifrado)
└─────────────────────────────────────────────────────────────┘

Landing pública (Astro) ──► Cloudflare Pages (gratis, independiente del VPS)
```

| Contenedor | Imagen | Función |
|---|---|---|
| `caddy` | `infra/caddy/Dockerfile` | HTTPS automático (Let's Encrypt), sirve la web y hace de proxy a la API. Único con puertos expuestos. |
| `api` | `apps/api/Dockerfile` | API REST NestJS. Aplica migraciones al arrancar. Healthcheck en `/api/health`. |
| `postgres` | `postgres:16-alpine` | Base de datos. Solo en la red interna. Extensión `pg_trgm` para búsqueda tolerante a errores. |
| `backup` | `infra/backup/Dockerfile` | Respaldo diario verificado. Guarda 7 diarios, 4 semanales y 12 mensuales, con copia cifrada en Cloudflare R2. |

## Estructura

```
apps/
  api/        NestJS 11 + Prisma 6 + PostgreSQL
    prisma/   schema, migraciones, seed (catálogo + usuario inicial)
    src/
      auth/           login JWT, guard global, roles
      clientes/       CRUD + búsqueda
      vehiculos/      búsqueda por placa/nombre/cédula, ficha con historial
      tipos-servicio/ catálogo con intervalos (km / meses)
      ordenes/        órdenes: recepción, ítems, hitos, entrega y PDF para firmar (orden-pdf.ts)
      recordatorios/  "le toca" / "pronto" por km estimado o fecha
      estadisticas/   órdenes por mes, servicios y marcas
      reportes/       PDF del historial
      importaciones/  plantilla Excel (+ importación, semana 5)
      usuarios/  health/  prisma/  common/
  web/        React 18 + Vite + TanStack Query + Tailwind 4 (blanco y rojo)
  landing/    Astro, sitio estático del taller
packages/
  shared/     lógica compartida con pruebas: recordatorios, placas, roles, datos del taller,
              checklist de recepción y dibujos SVG del carro (los usa la web y el PDF)
infra/        caddy/ · postgres/ · backup/
docs/         propuesta, prototipos
```

## Desarrollo local

Requisitos: Node 22+, pnpm, Docker Desktop.

```bash
pnpm install
pnpm dev:db                          # PostgreSQL en localhost:5434
cp apps/api/.env.example apps/api/.env
pnpm db:generate
pnpm db:migrate                      # crea las tablas
pnpm db:seed                         # catálogo + usuario luis / taller12345
pnpm dev:api                         # http://localhost:3000/api/docs  (Swagger)
pnpm dev:web                         # http://localhost:5173

# La base de desarrollo usa el puerto 5434 para no chocar con otro PostgreSQL local.
```

Verificación: `pnpm typecheck`, `pnpm test` y `pnpm build`. Las tres corren en CI en cada push (`.github/workflows/ci.yml`).

## Producción (VPS)

```bash
# en el servidor (Ubuntu + Docker)
git clone <repo> taller && cd taller
cp .env.example .env                 # completar dominio, claves y secretos
cp infra/backup/rclone.conf.example infra/backup/rclone.conf   # credenciales de R2
docker compose up -d --build
docker compose exec api ./node_modules/.bin/prisma db seed   # solo la primera vez
```

- El DNS de `APP_DOMAIN` debe apuntar al VPS **antes** de levantar Caddy (para el certificado).
- Firewall: solo 22 (SSH con llave), 80 y 443.
- Restaurar un respaldo: `docker compose exec backup restore.sh /backups/diarios/<archivo>.dump`
- **Prueba de restauración mensual** en una base temporal (está incluida en el mantenimiento).

## Pendiente según el cronograma

- [x] Orden de trabajo digital (recepción, carrocería, repuestos/mano de obra, entrega) y PDF para firmar
- [ ] Pantallas: vehículos, clientes, estadísticas, catálogo, usuarios
- [ ] Importación desde Excel (vista previa + confirmación)
- [ ] Landing: confirmar horario, fotos reales y dominio; despliegue en Cloudflare Pages
- [ ] Despliegue automático al VPS desde GitHub Actions
