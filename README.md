# MECÁNICA AUTOMOTRIZSánchez — Órdenes de trabajo e historial (Fase 1)

Sistema del taller **MECÁNICA AUTOMOTRIZSánchez** (Cumbayá, Quito):

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
│   backup (cada 6 h) ── pg_dump ──► /srv/respaldos ◄── SFTP ── PC del taller
└─────────────────────────────────────────────────────────────┘

Landing pública (Astro) ──► Cloudflare Pages (gratis, independiente del VPS)
```

| Contenedor | Imagen | Función |
|---|---|---|
| `caddy` | `infra/caddy/Dockerfile` | HTTPS automático (Let's Encrypt), sirve la web y hace de proxy a la API. Único con puertos expuestos. |
| `api` | `apps/api/Dockerfile` | API REST NestJS. Aplica migraciones al arrancar. Healthcheck en `/api/health`. |
| `postgres` | `postgres:16-alpine` | Base de datos. Solo en la red interna. Extensión `pg_trgm` para búsqueda tolerante a errores. |
| `backup` | `infra/backup/Dockerfile` | Respaldo verificado cada 6 h. Guarda 28 recientes, 4 semanales y 12 mensuales. La PC del taller los descarga por SFTP (sin nube). |

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
pnpm db:seed                         # catálogo de servicios (no crea usuarios)
pnpm crear-dueno                     # crea la cuenta del dueño (pide usuario y contraseña)
pnpm dev:api                         # http://localhost:3000/api/docs  (Swagger)
pnpm dev:web                         # http://localhost:5173

# La base de desarrollo usa el puerto 5434 para no chocar con otro PostgreSQL local.
```

Verificación: `pnpm typecheck`, `pnpm test` y `pnpm build`. Las tres corren en CI en cada push (`.github/workflows/ci.yml`).

## Cargar la cartera de clientes y vehículos (Excel del taller)

Carga **solo clientes y vehículos** confiables desde el Excel "BALANCE GENERAL". Las órdenes empiezan de cero en el sistema.
Las reglas de limpieza (qué se une y qué se descarta) están en `packages/shared/src/importacion.ts`, con pruebas.

```bash
pnpm importar-clientes "ruta/al/BALANCE GENERAL.xlsx"            # simulación: resumen + reporte-importacion-clientes.xlsx
pnpm importar-clientes "ruta/al/BALANCE GENERAL.xlsx" --aplicar  # carga (no duplica si se repite)
```

En el VPS:

```bash
docker compose cp "BALANCE GENERAL.xlsx" api:/tmp/balance.xlsx
docker compose exec api node prisma/importar-clientes.js /tmp/balance.xlsx            # simular
docker compose exec api node prisma/importar-clientes.js /tmp/balance.xlsx --aplicar  # cargar
```

> El Excel y el reporte tienen datos personales: están en `.gitignore` y no se suben al repo.

## Producción

```
GitHub (push a main) ──► CI: verificar → construir imágenes (ghcr.io) → SSH al VPS → infra/desplegar.sh
                                                                          (respaldo → pull → up → verificar)
VPS InterServer (1 slice, Nueva York)      app.tecnicentrosanchez.com   Caddy · API · Postgres · respaldos
Cloudflare Pages                           tecnicentrosanchez.com       landing (se reconstruye al guardar en "Mantenimiento web")
PC del taller                              respaldos por SFTP 3 veces al día (sin nube)
```

### Lo que se compra
| Qué | Dónde | Costo |
|---|---|---|
| VPS **1 slice** (1 core · 2 GB · 40 GB), **Nueva York**, Ubuntu 24.04 (o 22.04) | interserver.net → VPS | $3/mes |
| Dominio **tecnicentrosanchez.com** | Cloudflare → Domain Registration | ≈ $10.50/año |

### Primer despliegue (una sola vez)

**1. Llaves SSH** (en tu PC, PowerShell):
```powershell
ssh-keygen -t ed25519 -f $HOME\.ssh\taller-admin -C "diego"        # para entrar tú
ssh-keygen -t ed25519 -f $HOME\.ssh\taller-ci -C "github-actions" -N '""'   # para GitHub Actions (sin contraseña)
```

**2. VPS**: al comprarlo, entra como root (InterServer te da la IP y la clave) y ejecuta:
```bash
curl -fsSLO https://raw.githubusercontent.com/DiegoSteven/TallerQuito/main/infra/preparar-vps.sh   # o súbelo con scp
bash preparar-vps.sh "<contenido de taller-admin.pub>" "<contenido de taller-ci.pub>"
```
Deja el usuario `deploy` (solo con llave), el firewall, Docker, el swap y las actualizaciones automáticas.
**Antes de cerrar la sesión de root**, comprueba en otra terminal: `ssh -i ~/.ssh/taller-admin deploy@<IP>`.

**3. DNS en Cloudflare** (tecnicentrosanchez.com → DNS):
| Tipo | Nombre | Contenido | Proxy |
|---|---|---|---|
| A | `app` | IP del VPS | **Solo DNS** (nube gris: Caddy saca el certificado HTTPS) |

El dominio raíz y `www` los agrega solo Cloudflare Pages en el paso 6.

**4. Configuración en el VPS** (como `deploy`):
```bash
cd ~/taller
# Copia .env.example desde el repo y complétalo:
#   APP_DOMAIN=app.tecnicentrosanchez.com · POSTGRES_PASSWORD y JWT_SECRET largos y aleatorios:
openssl rand -base64 36        # úsalo para POSTGRES_PASSWORD
openssl rand -base64 48        # úsalo para JWT_SECRET
nano .env
```

**5. GitHub → Settings del repo**:
- **Secrets → Actions**:
  - `VPS_HOST` = IP del VPS;
  - `VPS_USUARIO` = `deploy`;
  - `VPS_SSH_KEY` = contenido de `taller-ci` (la privada);
  - `VPS_KNOWN_HOSTS` = salida de `ssh-keyscan -t ed25519 <IP>`. Verifica que la huella coincida con la del servidor (`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` en el VPS).
- **Variables → Actions**:
  - `DESPLIEGUE_ACTIVO` = `true`;
  - `APP_URL` = `https://app.tecnicentrosanchez.com`;
  - `LANDING_URL` = `https://tecnicentrosanchez.com`.
- **Environments**: se crea solo `produccion` en el primer despliegue. Ahí puedes exigir tu aprobación antes de cada despliegue.

Haz **push a main** (o re-ejecuta el workflow). El CI construye, publica y despliega. Luego, en el VPS:
```bash
docker compose exec api ./node_modules/.bin/prisma db seed      # catálogo de servicios
docker compose exec -it api node prisma/crear-dueno.js          # cuenta del dueño
sudo bash infra/servidor-respaldos.sh "<llave pública de la PC del taller>"   # ver infra/pc-taller/LEEME.md
```

**6. Landing en Cloudflare Pages** (Workers & Pages → Create → Pages → Connect to Git → este repo):
| Campo | Valor |
|---|---|
| Build command | `npx -y pnpm@12.16.1 install --frozen-lockfile && npx -y pnpm@12.16.1 --filter @taller/landing build` |
| Build output directory | `apps/landing/dist` |
| Variables | `PUBLIC_API_URL=https://app.tecnicentrosanchez.com` · `NODE_VERSION=22` |

- **Custom domains:** `tecnicentrosanchez.com` y `www.tecnicentrosanchez.com`.
- **Settings → Builds → Deploy hooks:** crea uno y pon la URL en el `.env` del VPS como `LANDING_DEPLOY_HOOK`. Luego ejecuta `docker compose up -d api` para que la API la tome.

**7. Vigilancia:** en UptimeRobot (gratis), un monitor HTTP a `https://app.tecnicentrosanchez.com/api/health`.

### Día a día
- **Desplegar:** push a `main` → el CI verifica, construye y despliega solo.
- **Volver a la versión anterior** (en el VPS): `bash infra/desplegar.sh "$(cat .version-anterior)"`.
- **Desplegar a mano** una versión concreta: `bash infra/desplegar.sh sha-1a2b3c4`.
- **Restaurar un respaldo:** `docker compose exec backup restore.sh /backups/diarios/<archivo>.dump` y luego `docker compose restart api`.
- **Respaldos:** cada 6 h en el VPS (28 recientes, 4 semanales y 12 mensuales) y uno "antes-de-desplegar" en cada despliegue. La **PC del taller** los descarga 3 veces al día por SFTP de solo lectura, sin nube (`infra/servidor-respaldos.sh` y `infra/pc-taller/LEEME.md`).
- **Fotos de la landing:** viven en el volumen `uploads`, se sirven en `/api/uploads/` y van con los respaldos (`fotos/`). Para devolverlas: `docker compose cp /srv/respaldos/datos/fotos/. api:/app/uploads/`.
- **Prueba de restauración mensual** en una base temporal (está incluida en el mantenimiento).

## Pendiente según el cronograma

- [x] Orden de trabajo digital (recepción, carrocería, repuestos/mano de obra, entrega) y PDF para firmar
- [ ] Pantallas: vehículos, clientes, estadísticas, catálogo, usuarios
- [ ] Importación desde Excel (vista previa + confirmación)
- [ ] Landing: confirmar horario, fotos reales y dominio; despliegue en Cloudflare Pages
- [x] CI/CD: imágenes en ghcr.io y despliegue automático al VPS (falta activarlo con el servidor)
