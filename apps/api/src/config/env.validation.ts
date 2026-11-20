const REQUERIDAS = ['DATABASE_URL', 'JWT_SECRET'] as const;

export function validarEntorno(config: Record<string, unknown>) {
  const faltan = REQUERIDAS.filter((k) => !config[k]);
  if (faltan.length) {
    throw new Error(`Faltan variables de entorno: ${faltan.join(', ')}. Revise el archivo .env`);
  }
  if (String(config.JWT_SECRET).length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
  }
  return config;
}
