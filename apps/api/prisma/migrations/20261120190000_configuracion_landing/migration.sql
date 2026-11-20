-- Contenido de la landing. Antes la creaba la API al arrancar con SQL suelto;
-- IF NOT EXISTS evita fallar (y no toca los datos) donde la tabla ya existe.
CREATE TABLE IF NOT EXISTS "configuraciones_landing" (
    "id" SERIAL NOT NULL,
    "clave" VARCHAR(50) NOT NULL DEFAULT 'principal',
    "datos" JSONB NOT NULL,
    "actualizado_en" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuraciones_landing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "configuraciones_landing_clave_key" ON "configuraciones_landing"("clave");
