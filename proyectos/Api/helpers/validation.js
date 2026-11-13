/**
 * Convierte la ruta de un error de Zod al nombre de campo utilizado por el frontend.
 * Los índices numéricos se escriben entre corchetes y las propiedades se separan con punto.
 *
 * @param {PropertyKey[]} [path] Ruta del error reportada por Zod.
 * @returns {string} Nombre del campo, por ejemplo lines[0].quantity, o texto vacío para la raíz.
 */
export function formatFieldPath(path = []) {
  return path.reduce(
    (field, part) =>
      typeof part === "number"
        ? `${field}[${part}]`
        : `${field}${field ? "." : ""}${part}`,
    "",
  );
}

/**
 * Prepara los errores de Zod para devolverlos al controlador.
 * Conserva el primer mensaje por campo. Los errores de stockGroupIDs se agrupan en una sola clave
 * porque el formulario muestra los grupos de productos como un único bloque de casillas.
 *
 * @param {import('zod').ZodError} error Error devuelto por safeParse.
 * @returns {{fields: string[], errors: Record<string, string>}} Nombres de campos inválidos y sus mensajes.
 */
export function formatValidationErrors(error) {
  const errors = {};
  for (const issue of error.issues) {
    const field =
      issue.path[0] === "stockGroupIDs"
        ? "stockGroupIDs"
        : formatFieldPath(issue.path) || "body";
    if (!Object.hasOwn(errors, field)) errors[field] = issue.message;
  }
  return { fields: Object.keys(errors), errors };
}
