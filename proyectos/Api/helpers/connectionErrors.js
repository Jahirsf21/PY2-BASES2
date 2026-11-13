/** Códigos de mssql y de red que indican que el nodo consultado no está disponible. */
export const CONNECTION_ERROR_CODES = Object.freeze([
  "ESOCKET",
  "ETIMEOUT",
  "ECONNCLOSED",
  "ENOTOPEN",
  "ECONNRESET",
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "ENETUNREACH",
]);

/**
 * Comprueba si un error corresponde a un fallo de conexión reconocido.
 *
 * @param {unknown} error Error de ejecución recibido.
 * @returns {boolean} Verdadero si su código está en CONNECTION_ERROR_CODES.
 */
export function isConnectionError(error) {
  return CONNECTION_ERROR_CODES.includes(error?.code);
}
