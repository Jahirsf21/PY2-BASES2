import { z } from 'zod'

const stringSchema = z.string()

/** Respuesta de error de la API con un mensaje de texto. */
const messageSchema = z.object({ message: stringSchema })

/** Acepta cualquier valor que Object.entries pueda recorrer; en otro caso usa un objeto vacío. */
const entriesSchema = z.union([z.record(z.string(), z.unknown()), z.array(z.unknown()), z.string()]).catch({})

/** Obtiene de Error.errors solo los mensajes de texto, indexados por nombre de campo. */
const fieldErrorsSchema = z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]).catch({}).transform(value => Object.fromEntries(
  Object.entries(value).flatMap(([field, message]) => {
    const result = stringSchema.safeParse(message)
    return result.success ? [[field, result.data]] : []
  }),
))

/**
 * Obtiene fields y errors de una respuesta 400 de la API.
 * Filtra respuestas parciales sin perder los campos válidos ni confiar en propiedades heredadas:
 * solo conserva nombres de texto y los mensajes de texto propios de errors para esos nombres.
 */
const apiValidationSchema = z.object({
  fields: z.array(z.unknown()).catch([]), errors: entriesSchema,
}).transform(({ fields, errors }) => {
  const names = fields.filter((field): field is string => stringSchema.safeParse(field).success)
  const messages = Object.fromEntries(Object.entries(errors))
  return {
    fields: names,
    errors: Object.fromEntries(names.flatMap(field => {
      const result = stringSchema.safeParse(Object.hasOwn(messages, field) ? messages[field] : undefined)
      return result.success ? [[field, result.data]] : []
    })) as Record<string, string>,
  }
}).catch(() => ({ fields: [], errors: {} }))

/**
 * Obtiene el mensaje de error devuelto por la API.
 *
 * @param body Cuerpo JSON de la respuesta, o null si no pudo leerse.
 * @param fallback Mensaje que se usa si la respuesta no incluye message de texto.
 * @returns Mensaje de la API o el mensaje alternativo.
 */
export function apiMessage(body: unknown, fallback: string): string {
  const result = messageSchema.safeParse(body)
  return result.success ? result.data.message : fallback
}

/**
 * Obtiene los errores de campo de una respuesta 400 de la API.
 * Nunca lanza una excepción: una respuesta sin el formato esperado produce listas vacías.
 *
 * @param body Cuerpo JSON de la respuesta, o null si no pudo leerse.
 * @returns Nombres de campos inválidos y sus mensajes.
 */
export function apiFieldErrors(body: unknown) {
  return apiValidationSchema.parse(body)
}

/**
 * Extrae los errores de campo que un cliente de la API agregó a un Error con estado 400.
 *
 * @param reason Error capturado al guardar el formulario.
 * @returns Mensajes por nombre de campo, o un objeto vacío si el error no es una validación 400.
 */
export function extractServerFieldErrors(reason: unknown): Record<string, string> {
  if (!(reason instanceof Error) || reason.cause !== 400) return {}
  const result = fieldErrorsSchema.safeParse('errors' in reason ? reason.errors : undefined)
  return result.success ? result.data : {}
}
