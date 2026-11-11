import { entityIdParamSchema, idSchema, textSchema } from '../schemas/common'
import { customerCreateSchema, customerUpdateSchema, supplierSchema } from '../schemas/entities'
import { stockItemSchema } from '../schemas/stockItems'
import { invoiceSchema } from '../schemas/sales'
import { validateSchema } from './validation'
import type { NewCustomer } from '../types/customers'
import type { NewSupplier } from '../types/suppliers'
import type { NewStockItem } from '../types/stockItems'
import type { NewInvoice } from '../types/sales'

/**
 * Comprueba que un campo de texto respete su obligatoriedad y longitud máxima.
 * Las reglas se definen en textSchema.
 *
 * @param errors Errores acumulados por nombre de campo.
 * @param field Nombre del campo a validar.
 * @param label Nombre legible del campo para el mensaje.
 * @param value Valor recibido.
 * @param maxLength Longitud máxima permitida, si aplica.
 * @param required Indica si el campo es obligatorio.
 * @returns Agrega un mensaje a errors cuando el valor es inválido.
 */
export function checkText(errors: Record<string, string>, field: string, label: string, value: unknown, maxLength?: number, required = false) {
  const result = textSchema(label, maxLength, required).safeParse(value)
  if (!result.success) errors[field] = result.error.issues[0].message
}

/**
 * Comprueba que un identificador sea un entero positivo dentro del rango int de SQL Server.
 * Las reglas se definen en idSchema.
 *
 * @param errors Errores acumulados por nombre de campo.
 * @param field Nombre del campo a validar.
 * @param label Nombre legible del campo para el mensaje.
 * @param value Valor recibido.
 * @param required Indica si el campo es obligatorio.
 * @returns Agrega un mensaje a errors cuando el identificador es inválido.
 */
export function checkId(errors: Record<string, string>, field: string, label: string, value: unknown, required = false) {
  const result = idSchema(label, required).safeParse(value)
  if (!result.success) errors[field] = result.error.issues[0].message
}

/**
 * Convierte y valida un identificador recibido en la URL con las reglas de los formularios.
 *
 * @param value Identificador de la ruta.
 * @returns Identificador entero positivo válido para SQL Server o null si es inválido.
 */
export function parseEntityId(value: string): number | null {
  const result = entityIdParamSchema.safeParse(value)
  return result.success ? result.data : null
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
  return validateSchema(updating ? customerUpdateSchema : customerCreateSchema, { ...customer })
}

/**
 * Valida los datos de creación o actualización de un proveedor antes de enviarlos al API.
 *
 * @param supplier Datos del proveedor introducidos en el formulario.
 * @returns Campos inválidos y sus mensajes.
 */
export function validateSupplier(supplier: NewSupplier) {
  return validateSchema(supplierSchema, { ...supplier })
}

/**
 * Valida los campos editables y las existencias de un producto antes de enviarlo al API.
 *
 * @param item Datos del producto introducidos en el formulario.
 * @returns Campos inválidos y sus mensajes.
 */
export function validateStockItem(item: NewStockItem) {
  return validateSchema(stockItemSchema, { ...item })
}

/**
 * Valida el encabezado y las líneas de la factura antes de enviarlos al API.
 *
 * @param invoice Factura completa preparada por el formulario.
 * @returns Campos inválidos y sus mensajes.
 */
export function validateInvoice(invoice: NewInvoice) {
  return validateSchema(invoiceSchema, { ...invoice })
}
