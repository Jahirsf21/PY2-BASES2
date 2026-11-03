import type { LoginInput, LoginResponse } from '@/lib/types/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Inicia sesión con las credenciales del usuario en la sucursal seleccionada.
 * El almacenamiento de la sesión se administra por separado.
 *
 * @param input Credenciales y sucursal para iniciar sesión.
 * @param signal Señal opcional para cancelar la solicitud.
 * @returns Respuesta con el token, los datos del usuario y la sucursal.
 */
export async function login(input: LoginInput, signal?: AbortSignal): Promise<LoginResponse> {
  if (!API_URL) throw new Error('La dirección de la API no está configurada.')
  let res: Response
  try {
    res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.any([AbortSignal.timeout(30000), ...signal ? [signal] : []]),
    })
  } catch {
    if (signal?.aborted) throw new DOMException('Solicitud cancelada.', 'AbortError')
    throw new Error('No fue posible conectar con la API. Intente nuevamente.')
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible iniciar sesión.')
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('La respuesta de inicio de sesión no es válida.')
  return body
}
