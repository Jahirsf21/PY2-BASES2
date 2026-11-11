import type { Node, Role, SessionInfo, StoredSession } from '../types/auth'
import { loginSessionSchema, storedSessionSchema } from '../schemas/auth'

export const SESSION_KEY = 'wwi.session'
export const SESSION_EXPIRED_MESSAGE = 'La sesión terminó. Inicie sesión nuevamente.'

export const branches: { value: Node; label: string }[] = [
  { value: 'san-jose', label: 'San José' },
  { value: 'limon', label: 'Limón' },
  { value: 'corporativo', label: 'Corporativo' },
]

/**
 * Valida la respuesta del login y prepara los datos que se almacenarán.
 * Incluye únicamente el token y los metadatos necesarios para la sesión.
 *
 * @param value Respuesta recibida del inicio de sesión.
 * @param requestedNode Sucursal seleccionada en el formulario.
 * @returns Sesión normalizada con los datos del usuario y su vencimiento.
 */
export function sessionFromLogin(value: unknown, requestedNode: Node): StoredSession {
  const result = loginSessionSchema(requestedNode).safeParse(value)
  if (result.success) return result.data
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
  const result = storedSessionSchema.safeParse(value)
  if (!result.success) {
    clearSession()
    throw new Error('La sesión almacenada no es válida. Inicie sesión nuevamente.')
  }
  if (result.data.expiresAt <= Date.now()) {
    clearSession()
    throw new Error(SESSION_EXPIRED_MESSAGE)
  }
  return result.data
}

/**
 * Guarda la sesión validada en la entrada propia del almacenamiento de la pestaña.
 * Persiste únicamente los campos permitidos, sin contraseñas ni datos adicionales.
 *
 * @param session Sesión que se desea guardar.
 */
export function saveSession(session: StoredSession): void {
  const result = storedSessionSchema.safeParse(session)
  if (!result.success || result.data.expiresAt <= Date.now()) {
    throw new Error('La sesión no es válida o ya venció. Inicie sesión nuevamente.')
  }
  try { window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(result.data)) } catch {
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
