-- No se carga historial sin km: el kilometraje vuelve a ser obligatorio en todas las órdenes
-- (los recordatorios por km dependen de él).
ALTER TABLE "ordenes_trabajo" ALTER COLUMN "kilometraje" SET NOT NULL;
