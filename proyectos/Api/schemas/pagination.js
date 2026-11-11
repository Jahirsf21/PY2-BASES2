import { z } from 'zod'

const message = 'pageNumber y pageSize deben ser enteros mayores a 0'
/**
 * Convierte un valor de req.query a número y exige un entero mayor a 0.
 *
 * @type {import('zod').ZodType<number>}
 */
const pageIntegerSchema = z.coerce.number({error: message})
    .refine(Number.isInteger, {error: message}).min(1, {error: message})

/**
 * Valida pageNumber y pageSize de los listados paginados.
 * Primero se comprueban ambos enteros; solo entonces se aplica el máximo de 100 a pageSize.
 *
 * @type {import('zod').ZodType<{pageNumber: number, pageSize: number}>}
 */
export const paginationSchema = z.object({
    pageNumber: pageIntegerSchema,
    pageSize: pageIntegerSchema,
}, {error: message}).pipe(z.object({
    pageNumber: z.number(),
    pageSize: z.number().max(100, {error: 'pageSize no puede ser mayor a 100'}),
}))
