/**
 * Crea el manejador de errores de una ruta que traduce números de error SQL a respuestas HTTP.
 * Se coloca después del controlador; los números no declarados continúan al manejador global.
 *
 * @param {Record<number, [number, string]>} map Errores como { número: [status, mensaje] }.
 * @returns {import('express').ErrorRequestHandler} Manejador que responde { message } o deriva el error.
 */
export const sqlErrors = (map) => (error, req, res, next) => {
  const entry = map[Number(error?.number)];
  if (!entry) return next(error);
  const [status, message] = entry;
  return res.status(status).json({ message });
};
