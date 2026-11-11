import { z } from 'zod'
import { formatFieldPath } from '../helpers/validation'

export const SQL_INT_MAX = 2147483647
type EmptyValue = string | null | undefined
type IssuePath = { path?: PropertyKey[] }
type Message = string | ((issue: IssuePath) => string)

/**
 * Indica si un campo no contiene un valor utilizable.
 * Considera vacíos null, undefined y el texto vacío, sin transformar el valor.
 *
 * @param value Valor a comprobar.
 * @returns Verdadero si el valor está ausente o contiene solo espacios.
 */
export function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && !value.trim())
}

const emptyValueSchema = z.custom<EmptyValue>(isEmpty)

/**
 * Aplica la obligatoriedad de un campo antes de validar su valor.
 * Un campo opcional acepta valores vacíos; uno obligatorio informa que falta antes de aplicar el esquema.
 *
 * @param schema Esquema del valor cuando el campo no está vacío.
 * @param label Nombre legible del campo, o función que lo obtiene del error.
 * @param required Indica si el campo es obligatorio.
 * @param invalidMessage Mensaje para un valor opcional inválido.
 * @returns Esquema que valida presencia y valor.
 */
export function withPresence<T extends z.ZodType>(schema: T, label: Message, required: true, invalidMessage: Message): z.ZodType<z.output<T>>
export function withPresence<T extends z.ZodType>(schema: T, label: Message, required: boolean, invalidMessage: Message): z.ZodType<z.output<T> | EmptyValue>
export function withPresence<T extends z.ZodType>(schema: T, label: Message, required: boolean, invalidMessage: Message) {
  if (!required) return z.union([emptyValueSchema, schema], { error: invalidMessage }).optional()
  return z.unknown().refine(value => !isEmpty(value), {
    error: issue => `${typeof label === 'function' ? label(issue) : label} es obligatorio.`, abort: true,
  }).pipe(schema)
}

/**
 * Crea el esquema de un campo de texto con su obligatoriedad y longitud máxima.
 *
 * @param label Nombre legible del campo para el mensaje.
 * @param maxLength Longitud máxima permitida, si aplica.
 * @param required Indica si el campo es obligatorio.
 * @returns Esquema del campo de texto.
 */
export function textSchema(label: string, maxLength: number | undefined, required: true): z.ZodType<string>
export function textSchema(label: string, maxLength?: number, required?: boolean): z.ZodType<EmptyValue>
export function textSchema(label: string, maxLength?: number, required = false) {
  const message = maxLength ? `${label} debe ser texto de máximo ${maxLength} caracteres.` : `${label} debe ser texto.`
  let schema = z.string({ error: message })
  if (maxLength) schema = schema.max(maxLength, { error: message })
  return withPresence(schema, label, required, message)
}

/**
 * Crea el esquema de un identificador entero positivo dentro del rango int de SQL Server.
 *
 * @param label Nombre legible del campo para el mensaje.
 * @param required Indica si el campo es obligatorio.
 * @returns Esquema del identificador.
 */
export function idSchema(label: string, required: true): z.ZodType<number>
export function idSchema(label: string, required?: boolean): z.ZodType<number | EmptyValue>
export function idSchema(label: string, required = false) {
  const message = `${label} debe ser un identificador entero positivo.`
  const schema = z.number({ error: message }).int({ error: message }).min(1, { error: message }).max(SQL_INT_MAX, { error: message })
  return withPresence(schema, label, required, message)
}

/**
 * Crea el esquema de un campo booleano opcional.
 *
 * @param label Nombre legible del campo para el mensaje.
 * @returns Esquema del campo booleano.
 */
export function booleanSchema(label: string) {
  const message = `${label} debe ser verdadero o falso.`
  return withPresence(z.boolean({ error: message }), label, false, message)
}

/**
 * Crea el esquema de un número no negativo de las columnas int y decimal de productos y facturas.
 * Usa la misma precisión que la API, sin convertir texto a números ni redondear.
 *
 * @param field Nombre del campo; se reemplaza por la ruta completa cuando el error la incluye.
 * @param decimals Cantidad de decimales permitidos; cero exige un entero.
 * @param required Indica si el valor es obligatorio.
 * @returns Esquema del monto o cantidad.
 */
export function amountSchema(field: string, decimals: number, required = false) {
  const label = (issue: IssuePath) => formatFieldPath(issue.path) || field
  const message = (issue: IssuePath) => `${label(issue)} debe ser un número no negativo${decimals ? ` con máximo ${decimals} decimales` : ' entero dentro del rango int'}.`
  let schema = z.number({ error: message }).min(0, { error: message })
  if (decimals === 0) {
    schema = schema.int({ error: message }).max(SQL_INT_MAX, { error: message })
  } else {
    schema = schema.lt(10 ** (18 - decimals), { error: message })
      .refine(value => Number(value.toFixed(decimals)) === value, { error: message })
  }
  return withPresence(schema, label, required, message)
}

const entityIdSchema = idSchema('Identificador', true)

/** Convierte un identificador de la URL, formado solo por dígitos, en un entero válido para SQL Server. */
export const entityIdParamSchema = z.string().regex(/^\d+$/).transform(Number)
  .refine(value => entityIdSchema.safeParse(value).success)
