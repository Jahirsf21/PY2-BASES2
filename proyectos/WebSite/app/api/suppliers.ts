import type { NewSupplier, SupplierAddress, SupplierCategory, SupplierContact, SupplierDetail, SupplierEdit, SuppliersResponse } from '@/lib/types/suppliers'

// URL base configurada para el servidor del API.
const API_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Obtiene una página de proveedores aplicando los filtros indicados.
 *
 * @param supplierName Nombre parcial o completo del proveedor.
 * @param supplierCategoryID Categoría de proveedor seleccionada o null para incluir todas.
 * @param deliveryMethodID Método de entrega seleccionado o null para incluir todos.
 * @param pageNumber Número de página a consultar.
 * @param pageSize Cantidad de proveedores por página.
 * @returns Respuesta paginada con los proveedores encontrados.
 */
export async function getSuppliers(supplierName: string, supplierCategoryID: number | null, deliveryMethodID: number | null, pageNumber: number, pageSize: number): Promise<SuppliersResponse> {
  const query = new URLSearchParams({
    supplierName,
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  })
  if (supplierCategoryID !== null) query.set('supplierCategoryID', String(supplierCategoryID))
  if (deliveryMethodID !== null) query.set('deliveryMethodID', String(deliveryMethodID))
  const res = await fetch(`${API_URL}/api/suppliers?${query}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener los proveedores')
  }
  return res.json()
}

/**
 * Obtiene todas las categorías disponibles para los proveedores.
 *
 * @returns Listado de categorías de proveedor.
 */
export async function getSupplierCategories(): Promise<SupplierCategory[]> {
  const res = await fetch(`${API_URL}/api/suppliers/categories`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener las categorías de proveedores')
  }
  return res.json()
}

/**
 * Obtiene la información general y bancaria de un proveedor.
 *
 * @param supplierID Identificador del proveedor.
 * @returns Arreglo con el detalle del proveedor solicitado.
 */
export async function getSupplierByID(supplierID: number): Promise<SupplierDetail[]> {
  const res = await fetch(`${API_URL}/api/suppliers/${supplierID}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const fallbackMessage = res.status === 404 ? 'Proveedor no encontrado' : 'No fue posible obtener el proveedor'
    throw new Error(typeof body?.message === 'string' ? body.message : fallbackMessage)
  }
  return res.json()
}

/**
 * Obtiene los contactos principal y alternativo de un proveedor.
 *
 * @param supplierID Identificador del proveedor.
 * @returns Arreglo con la información de los contactos del proveedor.
 */
export async function getSupplierContactsByID(supplierID: number): Promise<SupplierContact[]> {
  const res = await fetch(`${API_URL}/api/suppliers/${supplierID}/contacts`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener los contactos del proveedor')
  }
  return res.json()
}

/**
 * Obtiene las direcciones y coordenadas geográficas de un proveedor.
 *
 * @param supplierID Identificador del proveedor.
 * @returns Arreglo con las direcciones del proveedor.
 */
export async function getSupplierAddressByID(supplierID: number): Promise<SupplierAddress[]> {
  const res = await fetch(`${API_URL}/api/suppliers/${supplierID}/address`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener la dirección del proveedor')
  }
  return res.json()
}

/**
 * Obtiene los valores necesarios para editar un proveedor.
 *
 * @param supplierID Identificador del proveedor.
 * @returns Datos para precargar su edición.
 */
export async function getSupplierForEdit(supplierID: number): Promise<SupplierEdit> {
  const res = await fetch(`${API_URL}/api/suppliers/${supplierID}/edit`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const fallbackMessage = res.status === 404 ? 'Proveedor no encontrado' : 'No fue posible cargar el proveedor para editar'
    throw new Error(typeof body?.message === 'string' ? body.message : fallbackMessage)
  }
  return res.json()
}

/**
 * Crea un proveedor y devuelve el identificador generado.
 *
 * @param supplier Datos del proveedor.
 * @returns Identificador del proveedor creado.
 */
export async function createSupplier(supplier: NewSupplier): Promise<number> {
  const res = await fetch(`${API_URL}/api/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(supplier),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible crear el proveedor')
  }
  const body: { supplierID: number } = await res.json()
  return body.supplierID
}

/**
 * Actualiza todos los campos editables de un proveedor.
 *
 * @param supplierID Identificador del proveedor.
 * @param supplier Datos actualizados del proveedor.
 * @returns Promesa que se resuelve al actualizarlo.
 */
export async function updateSupplierByID(supplierID: number, supplier: NewSupplier): Promise<void> {
  const res = await fetch(`${API_URL}/api/suppliers/${supplierID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(supplier),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible actualizar el proveedor')
  }
}

/**
 * Elimina un proveedor que no tenga registros asociados.
 *
 * @param supplierID Identificador del proveedor a eliminar.
 * @returns Promesa que se resuelve cuando el proveedor se elimina.
 */
export async function deleteSupplierByID(supplierID: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/suppliers/${supplierID}`, { method: 'DELETE' })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible eliminar el proveedor')
  }
}
