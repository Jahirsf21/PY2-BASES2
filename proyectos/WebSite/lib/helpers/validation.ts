import type { z } from 'zod'

/**
 * Convierte la ruta de un error de Zod al nombre de campo que consumen los formularios.
 * Los índices numéricos se escriben entre corchetes y las propiedades se separan con punto.
 *
 * @param path Ruta del error reportada por Zod.
 * @returns Nombre del campo, por ejemplo lines[0].quantity, o texto vacío para la raíz.
 */
export function formatFieldPath(path: readonly PropertyKey[] = []): string {
  return path.reduce<string>((field, part) => typeof part === 'number'
    ? `${field}[${part}]`
    : `${field}${field ? '.' : ''}${String(part)}`, '')
}

/**
 * Prepara los errores de Zod para mostrarlos junto a sus campos.
 * Conserva el primer mensaje por campo. Los errores de stockGroupIDs se agrupan en una sola clave
 * porque el formulario muestra los grupos de productos como un único bloque de casillas.
 *
 * @param error Error devuelto por safeParse.
 * @returns Nombres de campos inválidos y sus mensajes.
 */
export function formatValidationErrors(error: z.ZodError) {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    const field = issue.path[0] === 'stockGroupIDs' ? 'stockGroupIDs' : formatFieldPath(issue.path) || 'body'
    if (!Object.hasOwn(errors, field)) errors[field] = issue.message
  }
  return { fields: Object.keys(errors), errors }
}

/**
 * Valida datos con un esquema y devuelve los errores agrupados por campo.
 *
 * @param schema Esquema que deben cumplir los datos.
 * @param data Datos a validar.
 * @returns Campos inválidos y sus mensajes; vacíos si los datos son válidos.
 */
export function validateSchema(schema: z.ZodType, data: unknown) {
  const result = schema.safeParse(data)
  return result.success ? { fields: [], errors: {} as Record<string, string> } : formatValidationErrors(result.error)
}
