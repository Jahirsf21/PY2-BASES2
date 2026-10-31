import type { NewCustomer } from '@/lib/types/customers'
import type { NewSupplier } from '@/lib/types/suppliers'
import type { NewStockItem } from '@/lib/types/stockItems'
import type { NewInvoice } from '@/lib/types/sales'

/**
 * Indica si un campo no contiene un valor utilizable.
 *
 * @param value Valor a comprobar.
 * @returns Verdadero si el valor está ausente o contiene solo espacios.
 */
function isEmpty(value: unknown) {
  return value === null || value === undefined || value === '' || (typeof value === 'string' && !value.trim())
}

/**
 * Comprueba que un campo de texto respete su obligatoriedad y longitud máxima.
 *
 * @param errors Errores acumulados por nombre de campo.
 * @param field Nombre del campo a validar.
 * @param label Nombre legible del campo para el mensaje.
 * @param value Valor recibido.
 * @param maxLength Longitud máxima permitida, si aplica.
 * @param required Indica si el campo es obligatorio.
 * @returns Agrega un mensaje a errors cuando el valor es inválido.
 */
function checkText(errors: Record<string, string>, field: string, label: string, value: unknown, maxLength?: number, required = false) {
  if (isEmpty(value)) {
    if (required) errors[field] = `${label} es obligatorio.`
    return
  }
  if (typeof value !== 'string' || (maxLength && value.length > maxLength)) {
    errors[field] = maxLength ? `${label} debe ser texto de máximo ${maxLength} caracteres.` : `${label} debe ser texto.`
  }
}

/**
 * Comprueba que un identificador sea un entero positivo dentro del rango int de SQL Server.
 *
 * @param errors Errores acumulados por nombre de campo.
 * @param field Nombre del campo a validar.
 * @param label Nombre legible del campo para el mensaje.
 * @param value Valor recibido.
 * @param required Indica si el campo es obligatorio.
 * @returns Agrega un mensaje a errors cuando el identificador es inválido.
 */
function checkId(errors: Record<string, string>, field: string, label: string, value: unknown, required = false) {
  if (isEmpty(value)) {
    if (required) errors[field] = `${label} es obligatorio.`
    return
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 2147483647) {
    errors[field] = `${label} debe ser un identificador entero positivo.`
  }
}

/**
 * Convierte y valida un identificador recibido en la URL con las reglas de los formularios.
 *
 * @param value Identificador de la ruta.
 * @returns Identificador entero positivo válido para SQL Server o null si es inválido.
 */
export function parseEntityId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null
  const id = Number(value)
  const errors: Record<string, string> = {}
  checkId(errors, 'id', 'Identificador', id, true)
  return errors.id ? null : id
}

/**
 * Comprueba que los días para pagar sean un entero no negativo válido para SQL Server.
 *
 * @param errors Errores acumulados por nombre de campo.
 * @param value Días para pagar.
 * @returns Agrega un mensaje a errors si los días son inválidos.
 */
function checkDays(errors: Record<string, string>, value: unknown) {
  if (isEmpty(value)) {
    errors.paymentDays = 'Días para pagar es obligatorio.'
  } else if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 2147483647) {
    errors.paymentDays = 'Días para pagar debe ser un entero no negativo de hasta 2147483647.'
  }
}

/**
 * Comprueba la longitud y el protocolo http o https del sitio web opcional.
 *
 * @param errors Errores acumulados por nombre de campo.
 * @param value Dirección del sitio web.
 * @returns Agrega un mensaje a errors si la URL es inválida.
 */
function checkUrl(errors: Record<string, string>, value: unknown) {
  checkText(errors, 'websiteURL', 'Sitio web', value, 256)
  if (isEmpty(value) || errors.websiteURL || typeof value !== 'string') return

  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      errors.websiteURL = 'Sitio web debe ser una URL http o https válida.'
    }
  } catch {
    errors.websiteURL = 'Sitio web debe ser una URL http o https válida.'
  }
}

/**
 * Comprueba que se proporcionen ambas coordenadas válidas o ninguna.
 *
 * @param errors Errores acumulados por nombre de campo.
 * @param latitude Latitud de entrega.
 * @param longitude Longitud de entrega.
 * @returns Agrega errores para ambas coordenadas si no son válidas.
 */
function checkCoordinates(errors: Record<string, string>, latitude: unknown, longitude: unknown) {
  if (isEmpty(latitude) && isEmpty(longitude)) return

  if (isEmpty(latitude) || isEmpty(longitude) ||
    typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    errors.latitude = 'Ingrese ambas coordenadas válidas (latitud entre -90 y 90, longitud entre -180 y 180) o deje las dos vacías.'
    errors.longitude = errors.latitude
  }
}

/**
 * Valida los campos compartidos por clientes y proveedores.
 *
 * @param data Datos a validar.
 * @param errors Errores acumulados por nombre de campo.
 * @returns Agrega los errores de los campos compartidos.
 */
function checkCommonFields(data: Record<string, unknown>, errors: Record<string, string>) {
  checkId(errors, 'lastEditedBy', 'Empleado', data.lastEditedBy, true)
  checkId(errors, 'primaryContactPersonID', 'Contacto principal', data.primaryContactPersonID, true)
  checkId(errors, 'deliveryMethodID', 'Método de entrega', data.deliveryMethodID, true)
  checkDays(errors, data.paymentDays)
  checkText(errors, 'phoneNumber', 'Teléfono', data.phoneNumber, 20, true)
  checkText(errors, 'faxNumber', 'Fax', data.faxNumber, 20)
  checkUrl(errors, data.websiteURL)
  checkText(errors, 'deliveryAddressLine1', 'Dirección de entrega, línea 1', data.deliveryAddressLine1, 60, true)
  checkText(errors, 'deliveryAddressLine2', 'Dirección de entrega, línea 2', data.deliveryAddressLine2, 60)
  checkId(errors, 'deliveryCityID', 'Ciudad de entrega', data.deliveryCityID, true)
  checkText(errors, 'deliveryPostalCode', 'Código postal', data.deliveryPostalCode, 10, true)
  checkText(errors, 'postalAddressLine1', 'Dirección postal, línea 1', data.postalAddressLine1, 60, true)
  checkText(errors, 'postalAddressLine2', 'Dirección postal, línea 2', data.postalAddressLine2, 60)
  checkCoordinates(errors, data.latitude, data.longitude)
}

/**
 * Prepara la lista de campos inválidos y sus mensajes para el formulario.
 *
 * @param errors Errores acumulados por nombre de campo.
 * @returns Nombres de campos inválidos y sus mensajes.
 */
function result(errors: Record<string, string>) {
  return { fields: Object.keys(errors), errors }
}

/**
 * Valida los datos de creación o actualización de un cliente antes de enviarlos al API.
 * Al crear, billToCustomerID puede omitirse; al actualizar, es obligatorio.
 *
 * @param customer Datos del cliente introducidos en el formulario.
 * @param updating Indica si se está actualizando un cliente existente.
 * @returns Campos inválidos y sus mensajes.
 */
export function validateCustomer(customer: NewCustomer, updating = false) {
  const data: Record<string, unknown> = { ...customer }
  const errors: Record<string, string> = {}
  checkText(errors, 'customerName', 'Nombre del cliente', data.customerName, 100, true)
  checkId(errors, 'customerCategoryID', 'Categoría', data.customerCategoryID, true)
  checkId(errors, 'billToCustomerID', 'Cliente por facturar', data.billToCustomerID, updating)
  checkCommonFields(data, errors)
  checkId(errors, 'alternateContactPersonID', 'Contacto alternativo', data.alternateContactPersonID)

  const discount = data.standardDiscountPercentage
  if (!isEmpty(discount) && (typeof discount !== 'number' || !Number.isFinite(discount) || discount < 0 || discount > 100 || Number(discount.toFixed(3)) !== discount)) {
    errors.standardDiscountPercentage = 'Descuento estándar debe ser un número entre 0 y 100 con máximo 3 decimales.'
  }

  const credit = data.creditLimit
  if (!isEmpty(credit) && (typeof credit !== 'number' || !Number.isFinite(credit) || credit < 0 || credit >= 1e16 || Number(credit.toFixed(2)) !== credit)) {
    errors.creditLimit = 'Límite de crédito debe ser un número no negativo y menor que 10^16 con máximo 2 decimales.'
  }

  if (!isEmpty(data.isStatementSent) && typeof data.isStatementSent !== 'boolean') {
    errors.isStatementSent = 'Enviar estados de cuenta debe ser verdadero o falso.'
  }
  if (!isEmpty(data.isOnCreditHold) && typeof data.isOnCreditHold !== 'boolean') {
    errors.isOnCreditHold = 'Crédito suspendido debe ser verdadero o falso.'
  }
  checkId(errors, 'buyingGroupID', 'Grupo de compra', data.buyingGroupID)
  return result(errors)
}

/**
 * Valida los datos de creación o actualización de un proveedor antes de enviarlos al API.
 *
 * @param supplier Datos del proveedor introducidos en el formulario.
 * @returns Campos inválidos y sus mensajes.
 */
export function validateSupplier(supplier: NewSupplier) {
  const data: Record<string, unknown> = { ...supplier }
  const errors: Record<string, string> = {}
  checkText(errors, 'supplierName', 'Nombre del proveedor', data.supplierName, 100, true)
  checkId(errors, 'supplierCategoryID', 'Categoría', data.supplierCategoryID, true)
  checkText(errors, 'supplierReference', 'Código de referencia', data.supplierReference, 20)
  checkCommonFields(data, errors)
  checkId(errors, 'alternateContactPersonID', 'Contacto alternativo', data.alternateContactPersonID, true)
  checkText(errors, 'bankAccountName', 'Nombre de la cuenta', data.bankAccountName, 50)
  checkText(errors, 'bankAccountBranch', 'Sucursal', data.bankAccountBranch, 50)
  checkText(errors, 'bankAccountCode', 'Código de banco', data.bankAccountCode, 20)
  checkText(errors, 'bankAccountNumber', 'Número de cuenta', data.bankAccountNumber, 20)
  checkText(errors, 'bankInternationalCode', 'Código SWIFT', data.bankInternationalCode, 20)
  checkText(errors, 'internalComments', 'Comentarios internos', data.internalComments)
  return result(errors)
}

function checkAmount(errors: Record<string, string>, field: string, value: unknown, decimals: number, required = false) {
  if (isEmpty(value)) {
    if (required) errors[field] = `${field} es obligatorio.`
    return
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 ||
    (decimals === 0 && (!Number.isInteger(value) || value > 2147483647)) ||
    (decimals > 0 && (value >= 10 ** (18 - decimals) || Number(value.toFixed(decimals)) !== value))) {
    errors[field] = `${field} debe ser un número no negativo${decimals ? ` con máximo ${decimals} decimales` : ' entero dentro del rango int'}.`
  }
}

/** Valida los campos editables y existencias de un producto antes de enviarlo al API. */
export function validateStockItem(item: NewStockItem) {
  const data: Record<string, unknown> = { ...item }
  const errors: Record<string, string> = {}
  checkText(errors, 'stockItemName', 'Nombre del producto', data.stockItemName, 100, true)
  checkId(errors, 'supplierID', 'Proveedor', data.supplierID, true)
  checkId(errors, 'lastEditedBy', 'Empleado', data.lastEditedBy, true)
  checkId(errors, 'colorID', 'Color', data.colorID)
  checkId(errors, 'unitPackageID', 'Empaque unitario', data.unitPackageID, true)
  checkId(errors, 'outerPackageID', 'Empaque exterior', data.outerPackageID, true)
  if (!Array.isArray(data.stockGroupIDs) || data.stockGroupIDs.length === 0 ||
    data.stockGroupIDs.some((id: unknown) => typeof id !== 'number' || !Number.isInteger(id) || id < 1 || id > 2147483647) ||
    new Set(data.stockGroupIDs).size !== data.stockGroupIDs.length) {
    errors.stockGroupIDs = 'Seleccione al menos un grupo de productos válido, sin repeticiones.'
  }
  for (const [field, maxLength] of Object.entries({brand: 50, size: 20, barcode: 50, binLocation: 20})) checkText(errors, field, field, data[field], maxLength)
  for (const field of ['leadTimeDays', 'reorderLevel', 'targetStockLevel', 'quantityOnHand']) checkAmount(errors, field, data[field], 0, field === 'quantityOnHand')
  checkAmount(errors, 'quantityPerOuter', data.quantityPerOuter, 0)
  if (data.quantityPerOuter === 0) errors.quantityPerOuter = 'quantityPerOuter debe ser mayor que cero.'
  for (const field of ['lastCostPrice', 'unitPrice', 'recommendedRetailPrice']) checkAmount(errors, field, data[field], 2, field === 'unitPrice')
  for (const field of ['taxRate', 'typicalWeightPerUnit']) checkAmount(errors, field, data[field], 3, field === 'taxRate')
  if (!isEmpty(data.isChillerStock) && typeof data.isChillerStock !== 'boolean') errors.isChillerStock = 'isChillerStock debe ser verdadero o falso.'
  return result(errors)
}

/** Valida encabezado y líneas de la factura antes de enviarlos al API. */
export function validateInvoice(invoice: NewInvoice) {
  const data: Record<string, unknown> = { ...invoice }
  const errors: Record<string, string> = {}
  for (const field of ['customerID', 'deliveryMethodID', 'contactPersonID', 'accountsPersonID', 'packedByPersonID', 'lastEditedBy']) checkId(errors, field, field, data[field], true)
  checkId(errors, 'billToCustomerID', 'Cliente por facturar', data.billToCustomerID)
  checkId(errors, 'salespersonPersonID', 'Vendedor', data.salespersonPersonID, true)
  checkText(errors, 'customerPurchaseOrderNumber', 'Número de orden', data.customerPurchaseOrderNumber, 20)
  checkText(errors, 'deliveryInstructions', 'Instrucciones de entrega', data.deliveryInstructions, 100)
  const date = data.invoiceDate
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) errors.invoiceDate = 'Indique una fecha de factura válida (AAAA-MM-DD).'
  if (!Array.isArray(data.lines) || !data.lines.length) errors.lines = 'La factura debe contener al menos una línea.'
  else data.lines.forEach((line, index) => {
    if (!line || typeof line !== 'object' || Array.isArray(line)) {
      errors[`lines[${index}]`] = 'La línea debe ser un producto con cantidad y precio.'
      return
    }
    checkId(errors, `lines[${index}].stockItemID`, 'Producto', line.stockItemID, true)
    checkAmount(errors, `lines[${index}].quantity`, line.quantity, 0, true)
    if (line.quantity === 0) errors[`lines[${index}].quantity`] = 'La cantidad debe ser mayor que cero.'
    checkAmount(errors, `lines[${index}].unitPrice`, line.unitPrice, 2, true)
  })
  return result(errors)
}
