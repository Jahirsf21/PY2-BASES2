import { z } from 'zod'

// Validan la estructura de las respuestas de la API sin descartar columnas de SQL.

/** Respuesta que debe ser un arreglo, como los catálogos. */
export const arrayResponseSchema = z.array(z.unknown())

/** Respuesta de detalle con exactamente una fila. */
export const singleRowResponseSchema = z.array(z.looseObject({})).length(1)

/** Respuesta de reporte: un arreglo, o un objeto paginado con el arreglo en data. */
export const reportResponseSchema = z.union([arrayResponseSchema, z.object({ data: arrayResponseSchema })])

/**
 * Crea el esquema que comprueba que una fila corresponde al identificador solicitado.
 *
 * @param field Columna que contiene el identificador, por ejemplo CustomerID.
 * @param id Identificador solicitado en la ruta.
 * @returns Esquema de la fila, que conserva las demás columnas.
 */
export function rowWithIdSchema(field: string, id: number) {
  return z.looseObject({ [field]: z.literal(id) })
}

/**
 * Crea el esquema del precio consultado para un producto de la factura.
 *
 * @param id Identificador del producto consultado.
 * @returns Esquema con StockItemID igual al producto y PrecioUnitario numérico.
 */
export function productPriceSchema(id: number) {
  return z.object({ StockItemID: z.literal(id), PrecioUnitario: z.number() })
}
