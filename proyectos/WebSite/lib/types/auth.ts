/** Rol de un usuario de la aplicación. */
export type Role = 'Administrador' | 'Corporativo'
/** Identificador de un nodo: una sucursal o Corporativo. */
export type Node = 'san-jose' | 'limon' | 'corporativo'

/** Credenciales enviadas al iniciar sesión. */
export interface LoginInput {
  userName: string
  password: string
  node: Node
}

/** Respuesta del inicio de sesión con el token y los datos del usuario. */
export interface LoginResponse {
  token: string
  node: Node
  user: {
    UserID: number
    UserName: string
    FullName: string
    Rol: Role
    Active: boolean
  }
}

/**
 * Metadatos de sesión utilizados para presentar los datos del usuario en la interfaz.
 * No demuestran que el usuario continúe activo en la API.
 */
export interface SessionInfo {
  userID: number
  userName: string
  fullName: string
  rol: Role
  node: Node
  expiresAt: number
}

/** Sesión guardada en sessionStorage, con el token de la API. */
export interface StoredSession extends SessionInfo {
  token: string
}
