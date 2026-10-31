import type { InvoiceEdit, InvoiceFilters, InvoiceHeader, InvoiceLine, InvoicesResponse, NewInvoice } from '@/lib/types/sales'

// URL base configurada para el servidor del API.
const API_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Obtiene una página de facturas aplicando filtros por número, fechas, cliente,
 * método de entrega y monto facturado.
 *
 * @param filters Filtros seleccionados en el listado de ventas.
 * @param pageNumber Número de página a consultar.
 * @param pageSize Cantidad de facturas por página.
 * @returns Respuesta paginada con las facturas encontradas.
 */
export async function getInvoices(filters: InvoiceFilters, pageNumber: number, pageSize: number): Promise<InvoicesResponse> {
  const query = new URLSearchParams({
    customerName: filters.customerName,
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  })
  if (filters.invoiceID !== null) {
    query.set('invoiceID', String(filters.invoiceID))
  }
  if (filters.deliveryMethodID !== null) {
    query.set('deliveryMethodID', String(filters.deliveryMethodID))
  }
  if (filters.invoiceDateFrom) {
    query.set('invoiceDateFrom', filters.invoiceDateFrom)
  }
  if (filters.invoiceDateTo) {
    query.set('invoiceDateTo', filters.invoiceDateTo)
  }
  if (filters.minInvoiceAmount !== null) {
    query.set('minInvoiceAmount', String(filters.minInvoiceAmount))
  }
  if (filters.maxInvoiceAmount !== null) {
    query.set('maxInvoiceAmount', String(filters.maxInvoiceAmount))
  }
  const res = await fetch(`${API_URL}/api/sales?${query}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener las facturas')
  }
  return res.json()
}

/**
 * Obtiene el encabezado de una factura.
 *
 * @param invoiceID Identificador de la factura.
 * @returns Arreglo con el encabezado solicitado.
 */
export async function getInvoiceByID(invoiceID: number): Promise<InvoiceHeader[]> {
  const res = await fetch(`${API_URL}/api/sales/${invoiceID}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const fallbackMessage = res.status === 404 ? 'Factura no encontrada' : 'No fue posible obtener la factura'
    throw new Error(typeof body?.message === 'string' ? body.message : fallbackMessage)
  }
  return res.json()
}

/**
 * Obtiene las líneas de una factura por separado de su encabezado.
 *
 * @param invoiceID Identificador de la factura.
 * @returns Arreglo de líneas; vacío si el API no encuentra líneas.
 */
export async function getInvoiceLinesByID(invoiceID: number): Promise<InvoiceLine[]> {
  const res = await fetch(`${API_URL}/api/sales/${invoiceID}/lines`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible obtener las líneas de la factura')
  }
  return res.json()
}

/**
 * Obtiene los campos editables del encabezado de una factura.
 *
 * @param invoiceID Identificador de la factura.
 * @returns Datos para precargar la edición del encabezado.
 */
export async function getInvoiceForEdit(invoiceID: number): Promise<InvoiceEdit> {
  const res = await fetch(`${API_URL}/api/sales/${invoiceID}/edit`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const fallbackMessage = res.status === 404 ? 'Factura no encontrada' : 'No fue posible cargar la factura para editar'
    throw new Error(typeof body?.message === 'string' ? body.message : fallbackMessage)
  }
  return res.json()
}

/**
 * Crea una factura con su encabezado y líneas.
 *
 * @param invoice Datos de la factura.
 * @returns Identificador de la factura creada.
 */
export async function createInvoice(invoice: NewInvoice): Promise<number> {
  const res = await fetch(`${API_URL}/api/sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible crear la factura')
  }
  const body: { invoiceID: number } = await res.json()
  return body.invoiceID
}

/**
 * Actualiza el encabezado y reemplaza las líneas de una factura.
 *
 * @param invoiceID Identificador de la factura.
 * @param invoice Datos actualizados de la factura.
 * @returns Promesa que se resuelve al actualizarla.
 */
export async function updateInvoiceByID(invoiceID: number, invoice: NewInvoice): Promise<void> {
  const res = await fetch(`${API_URL}/api/sales/${invoiceID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.message === 'string' ? body.message : 'No fue posible actualizar la factura')
  }
}
