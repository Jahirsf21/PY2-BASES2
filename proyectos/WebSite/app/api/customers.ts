import type { BillToCustomersResponse, BuyingGroup, CustomerAddress, CustomerCategory, CustomerContact, CustomerDetail, CustomerEdit, CustomersResponse, NewCustomer } from '@/lib/types/customers'

// URL base configurada para el servidor del API.
const API_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Obtiene una página de clientes aplicando los filtros indicados.
 *
 * @param customerName Nombre parcial o completo del cliente.
 * @param customerCategoryID Categoría de cliente seleccionada o null para incluir todas.
 * @param deliveryMethodID Método de entrega seleccionado o null para incluir todos.
 * @param pageNumber Número de página a consultar.
 * @param pageSize Cantidad de clientes por página.
 * @returns Respuesta paginada con los clientes encontrados.
 */
export async function getCustomers(customerName: string, customerCategoryID: number | null, deliveryMethodID: number | null, pageNumber: number, pageSize: number): Promise<CustomersResponse> {
  const query = new URLSearchParams({
    customerName,
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  })
  if (customerCategoryID !== null) query.set('customerCategoryID', String(customerCategoryID))
  if (deliveryMethodID !== null) query.set('deliveryMethodID', String(deliveryMethodID))
  const res = await fetch(`${API_URL}/api/customers?${query}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener los datos de clientes')
  }
  return res.json()
}

/**
 * Obtiene clientes que pueden seleccionarse como cliente por facturar.
 *
 * @param customerName Nombre parcial o completo del cliente.
 * @param pageNumber Número de página a consultar.
 * @param pageSize Cantidad de clientes por página.
 * @returns Respuesta paginada con el ID y nombre de cada cliente.
 */
export async function getBillToCustomers(customerName: string, pageNumber: number, pageSize: number): Promise<BillToCustomersResponse> {
  const query = new URLSearchParams({
    customerName,
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  })
  const res = await fetch(`${API_URL}/api/customers/bill-to?${query}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener los clientes por facturar')
  }
  return res.json()
}

/**
 * Obtiene todas las categorías disponibles para los clientes.
 *
 * @returns Listado de categorías de cliente.
 */
export async function getCustomerCategories(): Promise<CustomerCategory[]> {
  const res = await fetch(`${API_URL}/api/customers/categories`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener las categorías de clientes')
  }
  return res.json()
}

/**
 * Obtiene todos los grupos de compra disponibles.
 *
 * @returns Listado de grupos de compra.
 */
export async function getBuyingGroups(): Promise<BuyingGroup[]> {
  const res = await fetch(`${API_URL}/api/customers/buying-groups`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener los grupos de compra')
  }
  return res.json()
}

/**
 * Obtiene la información general de un cliente.
 *
 * @param customerID Identificador del cliente.
 * @returns Arreglo con el detalle del cliente solicitado.
 */
export async function getCustomerByID(customerID: number): Promise<CustomerDetail[]> {
  const res = await fetch(`${API_URL}/api/customers/${customerID}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const fallbackMessage = res.status === 404 ? 'Cliente no encontrado' : 'No fue posible obtener el cliente'
    throw new Error(typeof body?.message === 'string' ? body.message : fallbackMessage)
  }
  return res.json()
}

/**
 * Obtiene los contactos principal y alternativo de un cliente.
 *
 * @param customerID Identificador del cliente.
 * @returns Arreglo con la información de los contactos del cliente.
 */
export async function getCustomerContactsByID(customerID: number): Promise<CustomerContact[]> {
  const res = await fetch(`${API_URL}/api/customers/${customerID}/contacts`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener los contactos del cliente')
  }
  return res.json()
}

/**
 * Obtiene las direcciones y coordenadas geográficas de un cliente.
 *
 * @param customerID Identificador del cliente.
 * @returns Arreglo con las direcciones del cliente.
 */
export async function getCustomerAddressByID(customerID: number): Promise<CustomerAddress[]> {
  const res = await fetch(`${API_URL}/api/customers/${customerID}/address`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener la dirección del cliente')
  }
  return res.json()
}

/**
 * Obtiene los valores necesarios para editar un cliente.
 *
 * @param customerID Identificador del cliente.
 * @returns Datos para precargar su edición.
 */
export async function getCustomerForEdit(customerID: number): Promise<CustomerEdit> {
  const res = await fetch(`${API_URL}/api/customers/${customerID}/edit`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const fallbackMessage = res.status === 404 ? 'Cliente no encontrado' : 'No fue posible cargar el cliente para editar'
    throw new Error(typeof body?.message === 'string' ? body.message : fallbackMessage)
  }
  return res.json()
}

/**
 * Crea un cliente y devuelve el identificador asignado.
 *
 * @param customer Datos del cliente.
 * @returns Identificador del cliente creado.
 */
export async function createCustomer(customer: NewCustomer): Promise<number> {
  const res = await fetch(`${API_URL}/api/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible crear el cliente')
  }
  return res.json()
}

/**
 * Actualiza todos los campos editables de un cliente.
 *
 * @param customerID Identificador del cliente.
 * @param customer Datos actualizados del cliente.
 * @returns Promesa que se resuelve al actualizarlo.
 */
export async function updateCustomerByID(customerID: number, customer: NewCustomer): Promise<void> {
  const res = await fetch(`${API_URL}/api/customers/${customerID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible actualizar el cliente')
  }
}

/**
 * Elimina un cliente que no tenga facturas u otros registros asociados.
 *
 * @param customerID Identificador del cliente a eliminar.
 * @returns Promesa que se resuelve cuando el cliente se elimina.
 */
export async function deleteCustomerByID(customerID: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/customers/${customerID}`, { method: 'DELETE' })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible eliminar el cliente')
  }
}
