import type { CitiesResponse, Employee, PeopleResponse } from '@/lib/types/application'
import type { DeliveryMethod } from '@/lib/types/deliveryMethods'

// URL base configurada para el servidor del API.
const API_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Obtiene los métodos de entrega disponibles para los filtros y formularios.
 *
 * @returns Listado de métodos de entrega.
 */
export async function getDeliveryMethods(): Promise<DeliveryMethod[]> {
  const res = await fetch(`${API_URL}/api/delivery-methods`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener los métodos de entrega')
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
  const query = new URLSearchParams({ fullName, pageNumber: String(pageNumber), pageSize: String(pageSize) })
  const res = await fetch(`${API_URL}/api/people?${query}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener las personas')
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
  const query = new URLSearchParams({ cityName, pageNumber: String(pageNumber), pageSize: String(pageSize) })
  const res = await fetch(`${API_URL}/api/cities?${query}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener las ciudades')
  }
  return res.json()
}

/**
 * Obtiene las personas registradas como empleados.
 *
 * @returns Listado de empleados.
 */
export async function getEmployees(): Promise<Employee[]> {
  const res = await fetch(`${API_URL}/api/employees`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener los empleados')
  }
  return res.json()
}

/**
 * Obtiene los vendedores disponibles para asignar a una factura.
 *
 * @returns Listado de vendedores.
 */
export async function getSalespeople(): Promise<Employee[]> {
  const res = await fetch(`${API_URL}/api/salespeople`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener los vendedores')
  }
  return res.json()
}
