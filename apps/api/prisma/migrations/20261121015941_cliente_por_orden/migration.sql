-- AlterTable
ALTER TABLE "ordenes_trabajo" ADD COLUMN     "clienteId" INTEGER,
ALTER COLUMN "kilometraje" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_trabajo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Las órdenes existentes: las trajo el dueño actual del vehículo.
UPDATE "ordenes_trabajo" o SET "clienteId" = v."clienteId" FROM "vehiculos" v WHERE v.id = o."vehiculoId" AND o."clienteId" IS NULL;

CREATE INDEX "ordenes_trabajo_clienteId_idx" ON "ordenes_trabajo"("clienteId");
