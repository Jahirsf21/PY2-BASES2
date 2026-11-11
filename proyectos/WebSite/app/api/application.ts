import type { CitiesResponse, Employee, PeopleResponse } from '@/lib/types/application'
import type { DeliveryMethod } from '@/lib/types/deliveryMethods'
import { readSession, SESSION_EXPIRED_MESSAGE } from '@/lib/helpers/session'
import { apiMessage } from '@/lib/helpers/apiErrors'

const API_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Obtiene los métodos de entrega disponibles para los filtros y formularios.
 *
 * @returns Listado de métodos de entrega.
 */
export async function getDeliveryMethods(): Promise<DeliveryMethod[]> {
  const token = readSession()?.token
  if (!token) throw new Error(SESSION_EXPIRED_MESSAGE)
  const res = await fetch(`${API_URL}/api/delivery-methods`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(apiMessage(body, 'No fue posible obtener los métodos de entrega'), { cause: res.status })
  }
  return res.json()
}

/**
 * Busca personas de contacto por nombre, con paginación.
 *
 * @param fullName Nombre parcial o completo de la persona.
 * @param pageNumber Número de página a consultar.
 * @param pageSize Cantidad de personas por página.
 * @returns Respuesta paginada con las personas encontradas.
 */
export async function getPeople(fullName: string, pageNumber: number, pageSize: number): Promise<PeopleResponse> {
  const token = readSession()?.token
  if (!token) throw new Error(SESSION_EXPIRED_MESSAGE)
  const query = new URLSearchParams({ fullName, pageNumber: String(pageNumber), pageSize: String(pageSize) })
  const res = await fetch(`${API_URL}/api/people?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(apiMessage(body, 'No fue posible obtener las personas'), { cause: res.status })
  }
  return res.json()
}

/**
 * Busca ciudades por nombre, con paginación.
 *
 * @param cityName Nombre parcial o completo de la ciudad.
 * @param pageNumber Número de página a consultar.
 * @param pageSize Cantidad de ciudades por página.
 * @returns Respuesta paginada con las ciudades encontradas.
 */
export async function getCities(cityName: string, pageNumber: number, pageSize: number): Promise<CitiesResponse> {
  const token = readSession()?.token
  if (!token) throw new Error(SESSION_EXPIRED_MESSAGE)
  const query = new URLSearchParams({ cityName, pageNumber: String(pageNumber), pageSize: String(pageSize) })
  const res = await fetch(`${API_URL}/api/cities?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(apiMessage(body, 'No fue posible obtener las ciudades'), { cause: res.status })
  }
  return res.json()
}

/**
 * Obtiene las personas registradas como empleados.
 *
 * @returns Listado de empleados.
 */
export async function getEmployees(): Promise<Employee[]> {
  const token = readSession()?.token
  if (!token) throw new Error(SESSION_EXPIRED_MESSAGE)
  const res = await fetch(`${API_URL}/api/employees`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(apiMessage(body, 'No fue posible obtener los empleados'), { cause: res.status })
  }
  return res.json()
}

/**
 * Obtiene los vendedores disponibles para asignar a una factura.
 *
 * @returns Listado de vendedores.
 */
export async function getSalespeople(): Promise<Employee[]> {
  const token = readSession()?.token
  if (!token) throw new Error(SESSION_EXPIRED_MESSAGE)
  const res = await fetch(`${API_URL}/api/salespeople`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(apiMessage(body, 'No fue posible obtener los vendedores'), { cause: res.status })
  }
  return res.json()
}
