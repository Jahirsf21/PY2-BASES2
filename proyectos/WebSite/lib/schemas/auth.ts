import { z } from 'zod'
import { idSchema, textSchema } from './common'
import type { Node, StoredSession } from '../types/auth'

/** Identificador de uno de los tres nodos configurados. */
export const nodeSchema = z.enum(['san-jose', 'limon', 'corporativo'])

/** Rol reconocido por la aplicación. */
export const roleSchema = z.enum(['Administrador', 'Corporativo'])

/**
 * Combinación permitida de rol y nodo.
 * Administrador pertenece a san-jose o limon; Corporativo pertenece a corporativo.
 */
const roleNodeSchema = z.discriminatedUnion('rol', [
  z.object({ rol: z.literal('Administrador'), node: z.enum(['san-jose', 'limon']) }),
  z.object({ rol: z.literal('Corporativo'), node: z.literal('corporativo') }),
])

/** Valida el formulario de inicio de sesión antes de enviarlo al API. */
export const loginFormSchema = z.object({
  userName: z.string({ error: 'Ingrese su usuario y contraseña.' }).trim()
    .min(1, { error: 'Ingrese su usuario y contraseña.' })
    .max(50, { error: 'Nombre de usuario debe ser texto de máximo 50 caracteres.' }),
  password: z.string({ error: 'Ingrese su usuario y contraseña.' })
    .min(1, { error: 'Ingrese su usuario y contraseña.' })
    .max(255, { error: 'Contraseña debe ser texto de máximo 255 caracteres.' }),
  node: z.enum(['san-jose', 'limon', 'corporativo'], { error: 'Seleccione la sucursal en la que desea iniciar sesión.' }),
})

/** Identidad del usuario incluida en el JWT. */
const identitySchema = z.object({
  userID: idSchema('Usuario', true), userName: textSchema('Nombre de usuario', 50, true),
}).and(roleNodeSchema)

/** Encabezado del JWT; la API firma los tokens con HS256. */
const headerSchema = z.object({ alg: z.literal('HS256') })

/**
 * Contenido del JWT con su emisión y vencimiento en segundos.
 * Exige una vigencia positiva de hasta 24 horas, una emisión que no esté más de 60 segundos en el futuro
 * y un vencimiento representable en milisegundos.
 */
const payloadSchema = identitySchema.and(z.object({ exp: z.number().int(), iat: z.number().int() }))
  .refine(data => data.exp > data.iat && data.exp - data.iat <= 86400 &&
    data.iat <= Math.floor(Date.now() / 1000) + 60 && Number.isSafeInteger(data.exp * 1000))

/**
 * Decodifica un segmento del JWT y obtiene su contenido JSON.
 *
 * @param part Segmento del token codificado en Base64URL.
 * @returns Contenido JSON del segmento decodificado.
 */
function decodePart(part: string): unknown {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
  const bytes = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), character => character.charCodeAt(0))
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}

/**
 * Obtiene la identidad y el vencimiento del JWT para presentar la sesión.
 * Solo valida el formato y los metadatos para la UI. La firma siempre la verifica la API.
 * El resultado incluye el token y expiresAt en milisegundos.
 */
export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
  .transform((token, ctx) => {
    try {
      const [headerPart, payloadPart] = token.split('.')
      const header = headerSchema.safeParse(decodePart(headerPart))
      const payload = payloadSchema.safeParse(decodePart(payloadPart))
      if (header.success && payload.success) {
        const { userID, userName, rol, node, exp } = payload.data
        return { token, userID, userName, rol, node, expiresAt: exp * 1000 }
      }
    } catch { /* Un segmento inválido se trata como un token inválido, sin exponer su contenido. */ }
    ctx.addIssue({ code: 'custom', message: 'Token inválido.' })
    return z.NEVER
  })

/** Usuario devuelto por POST /api/auth/login, con los alias de columnas de SQL. */
const loginUserSchema = z.object({
  UserID: idSchema('Usuario', true),
  UserName: textSchema('Nombre de usuario', 50, true),
  FullName: textSchema('Nombre completo', undefined, true),
  Rol: roleSchema, Active: z.boolean(),
})

/** Estructura de la respuesta de POST /api/auth/login. */
export const loginResponseSchema = z.object({ token: z.string(), node: nodeSchema, user: loginUserSchema })

/**
 * Valida la sesión guardada en sessionStorage y su coherencia con los datos del JWT.
 * Admite tokens vencidos para que readSession conserve su mensaje específico de vencimiento.
 */
export const storedSessionSchema: z.ZodType<StoredSession> = z.object({
  token: tokenSchema, userID: idSchema('Usuario', true),
  userName: textSchema('Nombre de usuario', 50, true), fullName: textSchema('Nombre completo', undefined, true),
  rol: roleSchema, node: nodeSchema, expiresAt: z.number(),
}).refine(data => data.userID === data.token.userID && data.userName === data.token.userName &&
  data.rol === data.token.rol && data.node === data.token.node && data.expiresAt === data.token.expiresAt)
  .transform(data => ({ ...data.token, fullName: data.fullName }))

/**
 * Crea el esquema que convierte la respuesta del login en la sesión que se almacenará.
 * Exige un token vigente del nodo solicitado y un usuario activo cuya identidad coincida con el token.
 *
 * @param requestedNode Sucursal seleccionada en el formulario.
 * @returns Esquema que produce la sesión con el token y los metadatos del usuario.
 */
export function loginSessionSchema(requestedNode: Node): z.ZodType<StoredSession> {
  return z.object({ token: tokenSchema, node: z.literal(requestedNode), user: loginUserSchema })
    .refine(data => data.token.expiresAt > Date.now() && data.token.node === requestedNode &&
      data.user.Active === true && data.user.UserID === data.token.userID &&
      data.user.UserName === data.token.userName && data.user.Rol === data.token.rol)
    .transform(data => ({ ...data.token, fullName: data.user.FullName }))
}
