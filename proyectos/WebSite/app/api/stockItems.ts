import type { Color, NewStockItem, PackageType, StockGroup, StockItemDetail, StockItemEdit, StockItemsResponse } from '@/lib/types/stockItems'

// URL base configurada para el servidor del API.
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
  const query = new URLSearchParams({
    stockItemName,
    stockGroupIDsJson: JSON.stringify(stockGroupIDs),
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  })

  const res = await fetch(`${API_URL}/api/stock-items?${query}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener los productos')
  }
  return res.json()
}

/**
 * Obtiene los grupos de productos disponibles para filtrar y editar.
 *
 * @returns Listado de grupos de productos.
 */
export async function getStockGroups(): Promise<StockGroup[]> {
  const res = await fetch(`${API_URL}/api/stock-items/groups`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener los grupos de productos')
  }
  return res.json()
}

/**
 * Obtiene los colores disponibles para los productos.
 *
 * @returns Listado de colores.
 */
export async function getColors(): Promise<Color[]> {
  const res = await fetch(`${API_URL}/api/stock-items/colors`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener los colores')
  }
  return res.json()
}

/**
 * Obtiene los tipos de empaque disponibles para los productos.
 *
 * @returns Listado de tipos de empaque.
 */
export async function getPackageTypes(): Promise<PackageType[]> {
  const res = await fetch(`${API_URL}/api/stock-items/package-types`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener los empaques')
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
  const res = await fetch(`${API_URL}/api/stock-items/${stockItemID}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const fallbackMessage = res.status === 404 ? 'Producto no encontrado' : 'No fue posible obtener el producto'
    throw new Error(typeof body?.message === 'string' ? body.message : fallbackMessage)
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
  const res = await fetch(`${API_URL}/api/stock-items/${stockItemID}/groups`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    if (res.status === 404 && body?.message === 'Grupos del producto no encontrados') {
      return []
    }
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener los grupos del producto')
  }
  return res.json()
}

/**
 * Obtiene los valores editables de un producto.
 *
 * @param stockItemID Identificador del producto.
 * @returns Datos para precargar su edición.
 */
export async function getStockItemForEdit(stockItemID: number): Promise<StockItemEdit> {
  const res = await fetch(`${API_URL}/api/stock-items/${stockItemID}/edit`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const fallbackMessage = res.status === 404 ? 'Producto no encontrado' : 'No fue posible cargar el producto para editar'
    throw new Error(typeof body?.message === 'string' ? body.message : fallbackMessage)
  }
  return res.json()
}

/**
 * Crea un producto con existencias y grupos.
 *
 * @param item Datos del producto.
 * @returns Identificador del producto creado.
 */
export async function createStockItem(item: NewStockItem): Promise<number> {
  const res = await fetch(`${API_URL}/api/stock-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible crear el producto')
  }
  const body: { stockItemID: number } = await res.json()
  return body.stockItemID
}

/**
 * Actualiza un producto, sus existencias y sus grupos.
 *
 * @param stockItemID Identificador del producto.
 * @param item Datos actualizados del producto.
 * @returns Promesa que se resuelve al actualizarlo.
 */
export async function updateStockItemByID(stockItemID: number, item: NewStockItem): Promise<void> {
  const res = await fetch(`${API_URL}/api/stock-items/${stockItemID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible actualizar el producto')
  }
}

/**
 * Elimina un producto por su identificador.
 *
 * @param stockItemID Identificador del producto.
 * @returns Promesa que se resuelve al eliminarlo.
 */
export async function deleteStockItemByID(stockItemID: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/stock-items/${stockItemID}`, { method: 'DELETE' })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible eliminar el producto')
  }
}
