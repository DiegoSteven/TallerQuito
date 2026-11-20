-- AlterTable
ALTER TABLE "ordenes_trabajo" ADD COLUMN     "carroceria" TEXT,
ADD COLUMN     "combustible" INTEGER,
ADD COLUMN     "danios" JSONB,
ADD COLUMN     "fechaEntrega" TIMESTAMP(3),
ADD COLUMN     "fechaLlegada" TIMESTAMP(3),
ADD COLUMN     "fechaLlegadaRepuestos" TIMESTAMP(3),
ADD COLUMN     "fechaPedidoRepuestos" TIMESTAMP(3),
ADD COLUMN     "recepcion" JSONB;

-- AlterTable
ALTER TABLE "vehiculos" ADD COLUMN     "cilindraje" TEXT;

-- El combustible va en octavos: 0 (vacío) a 8 (lleno)
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_combustible_rango" CHECK ("combustible" IS NULL OR "combustible" BETWEEN 0 AND 8);
