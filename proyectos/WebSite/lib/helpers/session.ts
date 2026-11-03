import type { Node, Role, SessionInfo, StoredSession } from '../types/auth'
import { checkId, checkText } from './entityValidation'

export const SESSION_KEY = 'wwi.session'
export const SESSION_EXPIRED_MESSAGE = 'La sesión terminó. Inicie sesión nuevamente.'

export const branches: { value: Node; label: string }[] = [
  { value: 'san-jose', label: 'San José' },
  { value: 'limon', label: 'Limón' },
  { value: 'corporativo', label: 'Corporativo' },
]

/**
 * Comprueba que un valor sea un objeto distinto de null y no un arreglo.
 *
 * @param value Valor a comprobar.
 * @returns Verdadero si el valor es un objeto válido para consultar sus campos.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Comprueba la correspondencia entre el rol y la sucursal de la sesión.
 *
 * @param rol Rol recibido en los datos de sesión.
 * @param node Identificador de la sucursal.
 * @returns Verdadero si la combinación de rol y sucursal está permitida.
 */
function validRoleAndNode(rol: unknown, node: unknown): boolean {
  return (rol === 'Administrador' && (node === 'san-jose' || node === 'limon')) ||
    (rol === 'Corporativo' && node === 'corporativo')
}

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
 * No verifica la firma del token; esa validación corresponde a la API.
 *
 * @param token Token recibido del login o del almacenamiento de sesión.
 * @returns Datos del token con formato válido o null si no cumple las comprobaciones.
 */
function tokenInfo(token: unknown): Omit<SessionInfo, 'fullName'> | null {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return null
  try {
    const [headerPart, payloadPart] = token.split('.')
    const header = decodePart(headerPart)
    const payload = decodePart(payloadPart)
    if (!isRecord(header) || header.alg !== 'HS256' || !isRecord(payload)) return null
    const errors: Record<string, string> = {}
    checkId(errors, 'userID', 'Usuario', payload.userID, true)
    checkText(errors, 'userName', 'Nombre de usuario', payload.userName, 50, true)
    if (Object.keys(errors).length > 0 ||
      !validRoleAndNode(payload.rol, payload.node) || !Number.isSafeInteger(payload.exp) ||
      !Number.isSafeInteger(payload.iat) || Number(payload.exp) <= Number(payload.iat) ||
      Number(payload.exp) - Number(payload.iat) > 86400 || Number(payload.iat) > Math.floor(Date.now() / 1000) + 60 ||
      !Number.isSafeInteger(Number(payload.exp) * 1000)) return null
    return {
      userID: payload.userID as number,
      userName: payload.userName as string,
      rol: payload.rol as Role,
      node: payload.node as Node,
      expiresAt: Number(payload.exp) * 1000,
    }
  } catch {
    return null
  }
}

/**
 * Comprueba la estructura de la sesión y su coherencia con los datos del JWT.
 *
 * @param value Datos de sesión a comprobar.
 * @returns Verdadero si los metadatos coinciden con la identidad y el vencimiento del token.
 */
function isStoredSession(value: unknown): value is StoredSession {
  if (!isRecord(value)) return false
  const errors: Record<string, string> = {}
  checkText(errors, 'fullName', 'Nombre completo', value.fullName, undefined, true)
  const claims = tokenInfo(value.token)
  return Object.keys(errors).length === 0 && claims !== null &&
    value.userID === claims.userID && value.userName === claims.userName && value.rol === claims.rol &&
    value.node === claims.node && value.expiresAt === claims.expiresAt
}

/**
 * Valida la respuesta del login y prepara los datos que se almacenarán.
 * Incluye únicamente el token y los metadatos necesarios para la sesión.
 *
 * @param value Respuesta recibida del inicio de sesión.
 * @param requestedNode Sucursal seleccionada en el formulario.
 * @returns Sesión normalizada con los datos del usuario y su vencimiento.
 */
export function sessionFromLogin(value: unknown, requestedNode: Node): StoredSession {
  if (isRecord(value) && isRecord(value.user)) {
    const errors: Record<string, string> = {}
    checkText(errors, 'fullName', 'Nombre completo', value.user.FullName, undefined, true)
    const claims = tokenInfo(value.token)
    if (Object.keys(errors).length === 0 && claims && claims.expiresAt > Date.now() && value.node === requestedNode && claims.node === requestedNode &&
      value.user.Active === true && value.user.UserID === claims.userID && value.user.UserName === claims.userName &&
      value.user.Rol === claims.rol) {
      return { token: value.token as string, ...claims, fullName: value.user.FullName as string }
    }
  }
  throw new Error('La respuesta de inicio de sesión no es válida.')
}

/**
 * Obtiene los metadatos de la sesión para mostrarlos en la interfaz.
 *
 * @param session Sesión de la que se obtendrán los metadatos.
 * @returns Datos del usuario, rol, sucursal y vencimiento, sin incluir el token.
 */
export function sessionInfo(session: StoredSession): SessionInfo {
  return {
    userID: session.userID,
    userName: session.userName,
    fullName: session.fullName,
    rol: session.rol,
    node: session.node,
    expiresAt: session.expiresAt,
  }
}

/**
 * Recupera la sesión de la pestaña y descarta los datos inválidos o vencidos.
 * Debe ejecutarse desde efectos o eventos del navegador, no durante el render del servidor.
 *
 * @returns Sesión vigente o null si no hay datos guardados.
 */
export function readSession(): StoredSession | null {
  let text: string | null
  try { text = window.sessionStorage.getItem(SESSION_KEY) } catch {
    throw new Error('No fue posible leer el almacenamiento de sesión. Revise los permisos del navegador.')
  }
  if (text === null) return null
  let value: unknown
  try { value = JSON.parse(text) } catch { value = null }
  if (!isStoredSession(value)) {
    clearSession()
    throw new Error('La sesión almacenada no es válida. Inicie sesión nuevamente.')
  }
  if (value.expiresAt <= Date.now()) {
    clearSession()
    throw new Error(SESSION_EXPIRED_MESSAGE)
  }
  return { token: value.token, ...sessionInfo(value) }
}

/**
 * Guarda la sesión validada en la entrada propia del almacenamiento de la pestaña.
 * Persiste únicamente los campos permitidos, sin contraseñas ni datos adicionales.
 *
 * @param session Sesión que se desea guardar.
 */
export function saveSession(session: StoredSession): void {
  if (!isStoredSession(session) || session.expiresAt <= Date.now()) {
    throw new Error('La sesión no es válida o ya venció. Inicie sesión nuevamente.')
  }
  try { window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: session.token, ...sessionInfo(session) })) } catch {
    throw new Error('No fue posible guardar la sesión. Revise los permisos del navegador e intente nuevamente.')
  }
}

/**
 * Elimina únicamente la entrada de sesión de esta aplicación en la pestaña actual.
 * No revoca el JWT ni cierra las sesiones de otras pestañas.
 */
export function clearSession(): void {
  try { window.sessionStorage.removeItem(SESSION_KEY) } catch {
    throw new Error('No fue posible eliminar la sesión del almacenamiento. Cierre esta pestaña y revise los permisos del navegador.')
  }
}

/**
 * Obtiene el destino inicial permitido para el rol de la sesión.
 *
 * @param rol Rol del usuario autenticado.
 * @returns Ruta de inicio del rol o login si el rol no está reconocido.
 */
export function homeForRole(rol: Role): string {
  if (rol === 'Administrador') return '/'
  if (rol === 'Corporativo') return '/reports'
  return '/login'
}

/**
 * Obtiene el rol requerido para las páginas de los módulos protegidos.
 *
 * @param pathname Ruta de la página, sin parámetros de consulta.
 * @returns Rol requerido o null si la ruta no pertenece a un módulo protegido.
 */
export function requiredPageRole(pathname: string): Role | null {
  if (pathname === '/' || /^\/(?:customers|suppliers|inventory|sales)(?:\/|$)/.test(pathname)) return 'Administrador'
  if (/^\/reports(?:\/|$)/.test(pathname)) return 'Corporativo'
  return null
}
