import { nodeSchema, roleNodeSchema, loginSchema } from '../schemas/auth.js'
import { customerCreateSchema, customerUpdateSchema, supplierSchema } from '../schemas/entities.js'
import { stockItemSchema } from '../schemas/stockItems.js'
import { invoiceSchema } from '../schemas/sales.js'
import { formatValidationErrors } from './validation.js'

/**
 * Valida datos con un esquema y devuelve los errores agrupados por campo.
 *
 * @param {import('zod').ZodType} schema Esquema que deben cumplir los datos.
 * @param {unknown} data Datos a validar.
 * @returns {{fields: string[], errors: Record<string, string>}} Campos inválidos y sus mensajes; vacíos si los datos son válidos.
 */
function validate(schema, data) {
    const result = schema.safeParse(data)
    return result.success ? {fields: [], errors: {}} : formatValidationErrors(result.error)
}

/**
 * Comprueba si el identificador corresponde a un nodo configurado.
 *
 * @param {unknown} node Identificador recibido.
 * @returns {boolean} Verdadero para uno de los tres nodos permitidos.
 */
export function isValidNode(node) {
    return nodeSchema.safeParse(node).success
}

/**
 * Comprueba si el rol puede utilizar el nodo seleccionado.
 *
 * @param {unknown} rol Rol del usuario.
 * @param {unknown} node Identificador del nodo.
 * @returns {boolean} Verdadero si la combinación está permitida.
 */
export function isRoleAllowedInNode(rol, node) {
    return roleNodeSchema.safeParse({rol, node}).success
}

/**
 * Valida las credenciales y el nodo antes de ejecutar el procedimiento.
 *
 * @param {object} data Credenciales recibidas en la solicitud.
 * @returns {{fields: string[], errors: Record<string, string>}} Campos inválidos y sus mensajes.
 */
export function validateLogin(data) {
    return validate(loginSchema, data)
}

/**
 * Valida los datos de creación o actualización de un cliente antes de ejecutar el procedimiento.
 * Al crear, billToCustomerID puede omitirse; al actualizar, es obligatorio.
 *
 * @param {object} data Datos del cliente recibidos en la solicitud.
 * @param {boolean} [updating] Indica si se está actualizando un cliente existente.
 * @returns {{fields: string[], errors: Record<string, string>}} Campos inválidos y sus mensajes.
 */
export function validateCustomer(data, updating = false) {
    return validate(updating ? customerUpdateSchema : customerCreateSchema, data)
}

/**
 * Valida los datos de creación o actualización de un proveedor antes de ejecutar el procedimiento.
 *
 * @param {object} data Datos del proveedor recibidos en la solicitud.
 * @returns {{fields: string[], errors: Record<string, string>}} Campos inválidos y sus mensajes.
 */
export function validateSupplier(data) {
    return validate(supplierSchema, data)
}

/**
 * Valida los datos de creación y actualización de un producto.
 *
 * @param {object} data Campos del producto y existencias.
 * @returns {{fields: string[], errors: Record<string, string>}} Campos inválidos y mensajes.
 */
export function validateStockItem(data) {
    return validate(stockItemSchema, data)
}

/**
 * Valida el encabezado y las líneas de una factura antes de ejecutar el procedimiento.
 *
 * @param {object} data Factura completa.
 * @returns {{fields: string[], errors: Record<string, string>}} Campos inválidos y mensajes.
 */
export function validateInvoice(data) {
    return validate(invoiceSchema, data)
}
