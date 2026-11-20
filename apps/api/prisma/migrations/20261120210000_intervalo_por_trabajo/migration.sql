-- Próximo cambio por trabajo: el intervalo puede variar según el carro y lo que se le puso
-- (aceite mineral, sintético…). NULL = se usa el del catálogo. Las órdenes existentes no cambian.
ALTER TABLE "orden_items" ADD COLUMN "intervaloKm" INTEGER;
ALTER TABLE "orden_items" ADD COLUMN "intervaloMeses" INTEGER;

ALTER TABLE "orden_items" ADD CONSTRAINT "orden_items_intervalo_positivo"
  CHECK (("intervaloKm" IS NULL OR "intervaloKm" > 0) AND ("intervaloMeses" IS NULL OR "intervaloMeses" > 0));
