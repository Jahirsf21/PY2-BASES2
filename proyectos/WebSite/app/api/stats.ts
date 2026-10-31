import type { CustomerSalesSummaryResponse, CustomerSalesTrackingResponse, ProductCategorySalesByYear, ReportYear, SupplierPurchaseSummary, SupplierPurchaseTrackingResponse, TopCustomerByYear, TopProductByYear, TopSupplierByYear } from '@/lib/types/stats'

// URL base configurada para el servidor del API.
const API_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Obtiene los años disponibles para los filtros de los reportes de compras.
 *
 * @returns Años distintos registrados en las órdenes de compra.
 */
export async function getPurchaseYears(): Promise<ReportYear[]> {
  const res = await fetch(`${API_URL}/api/stats/purchase-years`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener los años de compras')
  }
  return res.json()
}

/**
 * Obtiene los años disponibles para los filtros de los reportes de ventas.
 *
 * @returns Años distintos registrados en las facturas.
 */
export async function getInvoiceYears(): Promise<ReportYear[]> {
  const res = await fetch(`${API_URL}/api/stats/invoice-years`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener los años de facturación')
  }
  return res.json()
}

/**
 * Obtiene los montos máximo, mínimo y promedio de órdenes de compra completas por proveedor y categoría.
 *
 * @param supplierName Nombre parcial o completo del proveedor.
 * @param supplierCategoryName Nombre parcial de categoría o texto vacío para incluir todas.
 * @returns Resumen de proveedores, incluyendo una fila de resumen general.
 */
export async function getSupplierPurchaseSummary(supplierName: string, supplierCategoryName: string): Promise<SupplierPurchaseSummary[]> {
  const query = new URLSearchParams({ supplierName, supplierCategoryName })
  const res = await fetch(`${API_URL}/api/stats/supplier-purchase-summary?${query}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener el resumen de compras por proveedor')
  }
  return res.json()
}

/**
 * Obtiene una página del resumen de ventas por cliente, incluyendo el resumen general.
 *
 * @param customerName Nombre parcial o completo del cliente.
 * @param customerCategoryName Nombre parcial de categoría o texto vacío para incluir todas.
 * @param pageNumber Número de página a consultar.
 * @param pageSize Cantidad de registros por página.
 * @returns Respuesta paginada con los montos máximo, mínimo y promedio.
 */
export async function getCustomerSalesSummary(customerName: string, customerCategoryName: string, pageNumber: number, pageSize: number): Promise<CustomerSalesSummaryResponse> {
  const query = new URLSearchParams({ customerName, customerCategoryName, pageNumber: String(pageNumber), pageSize: String(pageSize) })
  const res = await fetch(`${API_URL}/api/stats/customer-sales-summary?${query}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener el resumen de ventas por cliente')
  }
  return res.json()
}

/**
 * Obtiene los primeros cinco puestos de clientes por cantidad de facturas de cada año.
 *
 * @param invoiceYearFrom Año inicial o null para no limitar.
 * @param invoiceYearTo Año final o null para no limitar.
 * @returns Ranking anual de clientes, incluyendo empates.
 */
export async function getTopCustomersByYear(invoiceYearFrom: number | null, invoiceYearTo: number | null): Promise<TopCustomerByYear[]> {
  const query = new URLSearchParams()
  if (invoiceYearFrom !== null) {
    query.set('invoiceYearFrom', String(invoiceYearFrom))
  }
  if (invoiceYearTo !== null) {
    query.set('invoiceYearTo', String(invoiceYearTo))
  }
  const res = await fetch(`${API_URL}/api/stats/top-customers-by-year?${query}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener el ranking anual de clientes')
  }
  return res.json()
}

/**
 * Obtiene los primeros cinco puestos de productos por ganancia acumulada de cada año.
 *
 * @param year Año de las facturas o null para consultar todos los años.
 * @returns Ranking anual de productos, incluyendo empates.
 */
export async function getTopProductsByYear(year: number | null): Promise<TopProductByYear[]> {
  const query = new URLSearchParams()
  if (year !== null) {
    query.set('year', String(year))
  }
  const res = await fetch(`${API_URL}/api/stats/top-products-by-year?${query}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener el ranking anual de productos')
  }
  return res.json()
}

/**
 * Obtiene los primeros cinco puestos de proveedores por cantidad de compras de cada año.
 *
 * @param orderYearFrom Año inicial o null para no limitar.
 * @param orderYearTo Año final o null para no limitar.
 * @returns Ranking anual de proveedores, incluyendo empates.
 */
export async function getTopSuppliersByYear(orderYearFrom: number | null, orderYearTo: number | null): Promise<TopSupplierByYear[]> {
  const query = new URLSearchParams()
  if (orderYearFrom !== null) {
    query.set('orderYearFrom', String(orderYearFrom))
  }
  if (orderYearTo !== null) {
    query.set('orderYearTo', String(orderYearTo))
  }
  const res = await fetch(`${API_URL}/api/stats/top-suppliers-by-year?${query}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener el ranking anual de proveedores')
  }
  return res.json()
}

/**
 * Obtiene los montos facturados por año con una columna por grupo de productos.
 *
 * @returns Montos anuales de los diez grupos incluidos en el reporte.
 */
export async function getProductCategorySalesByYear(): Promise<ProductCategorySalesByYear[]> {
  const res = await fetch(`${API_URL}/api/stats/product-category-sales-by-year`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener las ventas anuales por grupo de productos')
  }
  return res.json()
}

/**
 * Obtiene una página del seguimiento mensual de las ventas por cliente.
 *
 * @param year Año de las facturas o null para no filtrar.
 * @param month Mes de las facturas (1 a 12) o null para no filtrar.
 * @param stockGroupIDs Categorías de productos seleccionadas o un arreglo vacío para incluir todas.
 * @param pageNumber Número de página a consultar.
 * @param pageSize Cantidad de registros por página.
 * @returns Respuesta paginada con montos de primera y última factura y cantidades por cliente, año y mes.
 */
export async function getCustomerSalesTracking(year: number | null, month: number | null, stockGroupIDs: number[], pageNumber: number, pageSize: number): Promise<CustomerSalesTrackingResponse> {
  const query = new URLSearchParams({ stockGroupIDsJson: JSON.stringify(stockGroupIDs), pageNumber: String(pageNumber), pageSize: String(pageSize) })
  if (year !== null) {
    query.set('year', String(year))
  }
  if (month !== null) {
    query.set('month', String(month))
  }
  const res = await fetch(`${API_URL}/api/stats/customer-sales-tracking?${query}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener el seguimiento de ventas por cliente')
  }
  return res.json()
}

/**
 * Obtiene una página del seguimiento mensual de las compras por proveedor.
 *
 * @param year Año de las compras o null para no filtrar.
 * @param month Mes de las compras (1 a 12) o null para no filtrar.
 * @param stockGroupIDs Categorías de productos seleccionadas o un arreglo vacío para incluir todas.
 * @param pageNumber Número de página a consultar.
 * @param pageSize Cantidad de registros por página.
 * @returns Respuesta paginada con montos de primera y última compra y cantidades de empaques por proveedor, año y mes.
 */
export async function getSupplierPurchaseTracking(year: number | null, month: number | null, stockGroupIDs: number[], pageNumber: number, pageSize: number): Promise<SupplierPurchaseTrackingResponse> {
  const query = new URLSearchParams({ stockGroupIDsJson: JSON.stringify(stockGroupIDs), pageNumber: String(pageNumber), pageSize: String(pageSize) })
  if (year !== null) {
    query.set('year', String(year))
  }
  if (month !== null) {
    query.set('month', String(month))
  }
  const res = await fetch(`${API_URL}/api/stats/supplier-purchase-tracking?${query}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener el seguimiento de compras por proveedor')
  }
  return res.json()
}
