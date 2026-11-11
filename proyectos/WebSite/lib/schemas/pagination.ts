import { z } from 'zod'

/**
 * Crea el esquema del control «Ir a página».
 * Convierte el valor del formulario a número y exige un entero entre 1 y la última página.
 *
 * @param totalPages Cantidad total de páginas del listado.
 * @returns Esquema que produce el número de página solicitado.
 */
export function pageNumberSchema(totalPages: number) {
  return z.coerce.number().refine(Number.isInteger).min(1).max(totalPages)
}
