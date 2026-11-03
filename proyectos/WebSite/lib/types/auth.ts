export type Role = 'Administrador' | 'Corporativo'
export type Node = 'san-jose' | 'limon' | 'corporativo'

export interface LoginInput {
  userName: string
  password: string
  node: Node
}

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

export interface StoredSession extends SessionInfo {
  token: string
}
