import type { Color, NewStockItem, PackageType, StockGroup, StockItemDetail, StockItemEdit, StockItemHoldings, StockItemHoldingsUpdate, StockItemsResponse, StockItemUpdate } from '@/lib/types/stockItems'

import { readSession, SESSION_EXPIRED_MESSAGE } from '@/lib/helpers/session'
import { apiFieldErrors, apiMessage } from '@/lib/helpers/apiErrors'
const API_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Obtiene una página de productos filtrada por nombre y grupos.
 *
 * @param stockItemName Nombre parcial o completo del producto.
 * @param stockGroupIDs Grupos seleccionados o un arreglo vacío para incluir todos.
 * @param pageNumber Número de página a consultar.
 * @param pageSize Cantidad de productos por página.
 * @returns Respuesta paginada con los productos encontrados.
 */
export async function getStockItems(
  stockItemName: string,
  stockGroupIDs: number[],
  pageNumber: number,
  pageSize: number,
): Promise<StockItemsResponse> {
  const token = readSession()?.token
  if (!token) throw new Error(SESSION_EXPIRED_MESSAGE)
  const query = new URLSearchParams({
    stockItemName,
    stockGroupIDsJson: JSON.stringify(stockGroupIDs),
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  })

  const res = await fetch(`${API_URL}/api/stock-items?${query}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(apiMessage(body, 'No fue posible obtener los productos'), { cause: res.status })
  }
  return res.json()
}

/**
 * Obtiene los grupos de productos disponibles para filtrar y editar.
 *
 * @returns Listado de grupos de productos.
 */
export async function getStockGroups(): Promise<StockGroup[]> {
  const token = readSession()?.token
  if (!token) throw new Error(SESSION_EXPIRED_MESSAGE)
  const res = await fetch(`${API_URL}/api/stock-items/groups`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(apiMessage(body, 'No fue posible obtener los grupos de productos'), { cause: res.status })
  }
  return res.json()
}

/**
 * Obtiene los colores disponibles para los productos.
 *
 * @returns Listado de colores.
 */
export async function getColors(): Promise<Color[]> {
  const token = readSession()?.token
  if (!token) throw new Error(SESSION_EXPIRED_MESSAGE)
  const res = await fetch(`${API_URL}/api/stock-items/colors`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(apiMessage(body, 'No fue posible obtener los colores'), { cause: res.status })
  }
  return res.json()
}

/**
 * Obtiene los tipos de empaque disponibles para los productos.
 *
 * @returns Listado de tipos de empaque.
 */
export async function getPackageTypes(): Promise<PackageType[]> {
  const token = readSession()?.token
  if (!token) throw new Error(SESSION_EXPIRED_MESSAGE)
  const res = await fetch(`${API_URL}/api/stock-items/package-types`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(apiMessage(body, 'No fue posible obtener los empaques'), { cause: res.status })
  }
  return res.json()
}

/**
 * Obtiene el detalle general de un producto.
 *
 * @param stockItemID Identificador del producto.
 * @returns Arreglo con el detalle solicitado.
 */
export async function getStockItemByID(stockItemID: number): Promise<StockItemDetail[]> {
  const token = readSession()?.token
  if (!token) throw new Error(SESSION_EXPIRED_MESSAGE)
  const res = await fetch(`${API_URL}/api/stock-items/${stockItemID}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const fallbackMessage = res.status === 404 ? 'Producto no encontrado' : 'No fue posible obtener el producto'
    throw new Error(apiMessage(body, fallbackMessage), { cause: res.status })
  }
  return res.json()
}

/**
 * Obtiene los grupos asociados a un producto por separado de su detalle.
 *
 * @param stockItemID Identificador del producto.
 * @returns Arreglo de grupos; vacío si el API no encuentra grupos.
 */
export async function getStockItemGroupsByID(stockItemID: number): Promise<StockGroup[]> {
  const token = readSession()?.token
  if (!token) throw new Error(SESSION_EXPIRED_MESSAGE)
  const res = await fetch(`${API_URL}/api/stock-items/${stockItemID}/groups`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    if (res.status === 404 && body?.message === 'Grupos del producto no encontrados') {
      return []
    }
    throw new Error(apiMessage(body, 'No fue posible obtener los grupos del producto'), { cause: res.status })
  }
  return res.json()
}

/**
 * Obtiene de Corporativo los valores editables del catálogo, sus grupos y su versión.
 *
 * @param stockItemID Identificador del producto.
 * @returns Datos para precargar su edición, con Grupos y Version.
 */
export async function getStockItemForEdit(stockItemID: number): Promise<StockItemEdit> {
  const token = readSession()?.token
  if (!token) throw new Error(SESSION_EXPIRED_MESSAGE)
  const res = await fetch(`${API_URL}/api/stock-items/${stockItemID}/edit`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const fallbackMessage = res.status === 404 ? 'Producto no encontrado' : 'No fue posible cargar el producto para editar'
    throw new Error(apiMessage(body, fallbackMessage), { cause: res.status })
  }
  return res.json()
}

/**
 * Crea un producto en el catálogo central, sin existencias.
 *
 * @param item Datos del producto.
 * @returns Identificador del producto creado.
 */
export async function createStockItem(item: NewStockItem): Promise<number> {
  const token = readSession()?.token
  if (!token) throw new Error(SESSION_EXPIRED_MESSAGE)
  const res = await fetch(`${API_URL}/api/stock-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(item),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const error = new Error(apiMessage(body, 'No fue posible crear el producto'), { cause: res.status })
    if (res.status === 400) {
      Object.assign(error, apiFieldErrors(body))
    }
    throw error
  }
  const body: { stockItemID: number } = await res.json()
  return body.stockItemID
}

/**
 * Actualiza el catálogo de un producto y sus grupos con la versión cargada en el formulario.
 *
 * @param stockItemID Identificador del producto.
 * @param item Datos actualizados del catálogo, con version.
 * @returns Promesa que se resuelve al actualizarlo.
 */
export async function updateStockItemByID(stockItemID: number, item: StockItemUpdate): Promise<void> {
  const token = readSession()?.token
  if (!token) throw new Error(SESSION_EXPIRED_MESSAGE)
  const res = await fetch(`${API_URL}/api/stock-items/${stockItemID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(item),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const error = new Error(apiMessage(body, 'No fue posible actualizar el producto'), { cause: res.status })
    if (res.status === 400) {
      Object.assign(error, apiFieldErrors(body))
    }
    throw error
  }
}

/**
 * Elimina un producto por su identificador.
 *
 * @param stockItemID Identificador del producto.
 * @returns Promesa que se resuelve al eliminarlo.
 */
export async function deleteStockItemByID(stockItemID: number): Promise<void> {
  const token = readSession()?.token
  if (!token) throw new Error(SESSION_EXPIRED_MESSAGE)
  const res = await fetch(`${API_URL}/api/stock-items/${stockItemID}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(apiMessage(body, 'No fue posible eliminar el producto'), { cause: res.status })
  }
}

/**
 * Obtiene las existencias del producto en la sucursal de la sesión para ajustarlas.
 *
 * @param stockItemID Identificador del producto.
 * @returns Existencias con su versión; sin fila, la cantidad es 0 y los demás valores null.
 */
export async function getStockItemHoldings(stockItemID: number): Promise<StockItemHoldings> {
  const token = readSession()?.token
  if (!token) throw new Error(SESSION_EXPIRED_MESSAGE)
  const res = await fetch(`${API_URL}/api/stock-items/${stockItemID}/holdings`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(apiMessage(body, 'No fue posible cargar las existencias'), { cause: res.status })
  }
  return res.json()
}

/**
 * Guarda los valores absolutos de las existencias del producto en la sucursal de la sesión.
 *
 * @param stockItemID Identificador del producto.
 * @param holdings Existencias y la versión cargada en el formulario.
 * @returns Nueva versión de las existencias.
 */
export async function adjustStockItemHoldings(stockItemID: number, holdings: StockItemHoldingsUpdate): Promise<string> {
  const token = readSession()?.token
  if (!token) throw new Error(SESSION_EXPIRED_MESSAGE)
  const res = await fetch(`${API_URL}/api/stock-items/${stockItemID}/holdings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(holdings),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const error = new Error(apiMessage(body, 'No fue posible guardar las existencias'), { cause: res.status })
    if (res.status === 400) {
      Object.assign(error, apiFieldErrors(body))
    }
    throw error
  }
  const body: { version: string } = await res.json()
  return body.version
}
