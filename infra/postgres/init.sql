-- Se ejecuta solo la primera vez que se crea el volumen de la base de datos.
-- Búsqueda tolerante a errores (similitud de texto) para placas y nombres.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
