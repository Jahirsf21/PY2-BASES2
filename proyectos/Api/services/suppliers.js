import {getPool} from '../config/database.js'
import sql from "mssql"

/**
 * Obtiene una página de proveedores junto con el total de registros.
 * Permite filtrar opcionalmente por nombre de proveedor, categoría y método de entrega.
 *
 * @param {string|null} supplierName Nombre del proveedor (búsqueda parcial) o null para no filtrar.
 * @param {number|null} supplierCategoryID ID de la categoría del proveedor o null para no filtrar.
 * @param {number|null} deliveryMethodID ID del método de entrega o null para no filtrar.
 * @param {number} pageNumber Número de página solicitado.
 * @param {number} pageSize Cantidad de proveedores por página.
 * @returns {Promise<{totalCount: number, data: object[]}>} Total de registros y proveedores de la página.
 */
export async function getSuppliers(supplierName, supplierCategoryID, deliveryMethodID, pageNumber, pageSize) {
    const connection = (await getPool()).request()
    connection.input('SupplierName', sql.NVarChar, supplierName)
    connection.input('SupplierCategoryID', sql.Int, supplierCategoryID)
    connection.input('DeliveryMethodID', sql.Int, deliveryMethodID)
    connection.input('PageNumber', sql.Int, pageNumber)
    connection.input('PageSize', sql.Int, pageSize)
    connection.output('TotalCount', sql.Int)
    const result = await connection.execute('Purchasing.GetSuppliers')
    return {
        totalCount: result.output.TotalCount,
        data: result.recordset
    }
}

/**
 * Obtiene todas las categorías de proveedor ordenadas por su identificador.
 * Se usa para llenar el combo de filtros de la lista de proveedores.
 *
 * @returns {Promise<object[]>} Listado de categorías de proveedor.
 */
export async function getSupplierCategories() {
    const connection = (await getPool()).request()
    const result = await connection.execute('Purchasing.GetSupplierCategories')
    return result.recordset
}

/**
 * Obtiene el detalle general de un proveedor por su identificador.
 * Incluye código de referencia, nombre, categoría, método de entrega,
 * días de gracia, teléfono, fax, sitio web y datos bancarios.
 *
 * @param {number} supplierID Identificador del proveedor.
 * @returns {Promise<object[]>} Datos del proveedor en una fila, o un arreglo vacío si no existe.
 */
export async function getSupplierDetail(supplierID) {
    const connection = (await getPool()).request()
    connection.input('SupplierID', sql.Int, supplierID)
    const result = await connection.execute('Purchasing.GetSupplierDetail')
    return result.recordset
}

/**
 * Obtiene los contactos (principal y alternativo) de un proveedor por su identificador.
 * Devuelve nombre, teléfono, fax y correo de ambos contactos en una sola fila.
 *
 * @param {number} supplierID Identificador del proveedor.
 * @returns {Promise<object[]>} Datos de los contactos en una fila, o un arreglo vacío si no existe.
 */
export async function getSupplierContacts(supplierID) {
    const connection = (await getPool()).request()
    connection.input('SupplierID', sql.Int, supplierID)
    const result = await connection.execute('Purchasing.GetSupplierContacts')
    return result.recordset
}

/**
 * Obtiene las direcciones de entrega y postal de un proveedor,
 * junto con su ubicación geográfica (latitud/longitud).
 *
 * @param {number} supplierID Identificador del proveedor.
 * @returns {Promise<object[]>} Direcciones y coordenadas en una fila, o un arreglo vacío si no existe.
 */
export async function getSupplierAddress(supplierID) {
    const connection = (await getPool()).request()
    connection.input('SupplierID', sql.Int, supplierID)
    const result = await connection.execute('Purchasing.GetSupplierAddress')
    return result.recordset
}

/**
 * Inserta un proveedor mediante Purchasing.InsertSupplier.
 * Lanza 52003 si lastEditedBy no corresponde a un empleado válido.
 * Requiere un contacto alternativo.
 * La ciudad y el código postal de entrega se guardan también como datos postales.
 *
 * @param {object} params Datos del proveedor.
 * @param {string} params.supplierName Nombre del proveedor.
 * @param {number} params.supplierCategoryID ID de la categoría del proveedor.
 * @param {number} params.lastEditedBy ID del empleado que registra el proveedor.
 * @param {string|null} params.supplierReference Código de referencia o null.
 * @param {number} params.primaryContactPersonID ID del contacto principal.
 * @param {number} params.alternateContactPersonID ID del contacto alternativo.
 * @param {number} params.deliveryMethodID ID del método de entrega.
 * @param {number} params.paymentDays Plazo de pago en días.
 * @param {string} params.phoneNumber Número telefónico del proveedor.
 * @param {string|null} params.faxNumber Número de fax o null.
 * @param {string|null} params.websiteURL URL del sitio web o null.
 * @param {string|null} params.bankAccountName Nombre de la cuenta bancaria o null.
 * @param {string|null} params.bankAccountBranch Sucursal bancaria o null.
 * @param {string|null} params.bankAccountCode Código de la cuenta bancaria o null.
 * @param {string|null} params.bankAccountNumber Número de cuenta bancaria o null.
 * @param {string|null} params.bankInternationalCode Código bancario internacional o null.
 * @param {string} params.deliveryAddressLine1 Primera línea de la dirección de entrega.
 * @param {string|null} params.deliveryAddressLine2 Segunda línea de la dirección de entrega o null.
 * @param {number} params.deliveryCityID ID compartido de la ciudad de entrega y postal.
 * @param {string} params.deliveryPostalCode Código postal compartido para ambas direcciones.
 * @param {string} params.postalAddressLine1 Primera línea de la dirección postal.
 * @param {string|null} params.postalAddressLine2 Segunda línea de la dirección postal o null.
 * @param {string|null} params.internalComments Comentarios internos o null.
 * @param {number|null} params.latitude Latitud de entrega o null.
 * @param {number|null} params.longitude Longitud de entrega o null.
 * @returns {Promise<number>} Identificador del proveedor creado.
 */
export async function insertSupplier(params) {
    const connection = (await getPool()).request()
    connection.input('SupplierName', sql.NVarChar, params.supplierName)
    connection.input('SupplierCategoryID', sql.Int, params.supplierCategoryID)
    connection.input('LastEditedBy', sql.Int, params.lastEditedBy)
    connection.input('SupplierReference', sql.NVarChar, params.supplierReference ?? null)
    connection.input('PrimaryContactPersonID', sql.Int, params.primaryContactPersonID)
    connection.input('AlternateContactPersonID', sql.Int, params.alternateContactPersonID)
    connection.input('DeliveryMethodID', sql.Int, params.deliveryMethodID)
    connection.input('PaymentDays', sql.Int, params.paymentDays)
    connection.input('PhoneNumber', sql.NVarChar, params.phoneNumber)
    connection.input('FaxNumber', sql.NVarChar, params.faxNumber ?? null)
    connection.input('WebsiteURL', sql.NVarChar, params.websiteURL ?? null)
    connection.input('BankAccountName', sql.NVarChar, params.bankAccountName ?? null)
    connection.input('BankAccountBranch', sql.NVarChar, params.bankAccountBranch ?? null)
    connection.input('BankAccountCode', sql.NVarChar, params.bankAccountCode ?? null)
    connection.input('BankAccountNumber', sql.NVarChar, params.bankAccountNumber ?? null)
    connection.input('BankInternationalCode', sql.NVarChar, params.bankInternationalCode ?? null)
    connection.input('DeliveryAddressLine1', sql.NVarChar, params.deliveryAddressLine1)
    connection.input('DeliveryAddressLine2', sql.NVarChar, params.deliveryAddressLine2 ?? null)
    connection.input('DeliveryCityID', sql.Int, params.deliveryCityID)
    connection.input('DeliveryPostalCode', sql.NVarChar, params.deliveryPostalCode)
    connection.input('PostalAddressLine1', sql.NVarChar, params.postalAddressLine1)
    connection.input('PostalAddressLine2', sql.NVarChar, params.postalAddressLine2 ?? null)
    connection.input('InternalComments', sql.NVarChar(sql.MAX), params.internalComments ?? null)
    connection.input('Latitude', sql.Float, params.latitude ?? null)
    connection.input('Longitude', sql.Float, params.longitude ?? null)
    connection.output('NewSupplierID', sql.Int)
    const result = await connection.execute('Purchasing.InsertSupplier')
    return result.output.NewSupplierID
}

/**
 * Obtiene los valores editables y nombres de referencia de un proveedor.
 * La ciudad y el código postal son compartidos por las direcciones de entrega y postal.
 *
 * @param {number} supplierID Identificador del proveedor.
 * @returns {Promise<object[]>} Datos para precargar el formulario, o un arreglo vacío si no existe.
 */
export async function getSupplierForEdit(supplierID) {
    const connection = (await getPool()).request()
    connection.input('SupplierID', sql.Int, supplierID)
    const result = await connection.execute('Purchasing.GetSupplierForEdit')
    return result.recordset
}

/**
 * Actualiza un proveedor mediante Purchasing.UpdateSupplier.
 * Lanza 52000 si no existe y 52003 si lastEditedBy no es un empleado válido.
 * Requiere un contacto alternativo.
 * La ciudad y el código postal de entrega también actualizan los datos postales.
 *
 * @param {number} supplierID Identificador del proveedor a actualizar.
 * @param {object} params Datos editables del proveedor.
 * @param {string} params.supplierName Nombre del proveedor.
 * @param {number} params.supplierCategoryID ID de la categoría del proveedor.
 * @param {number} params.lastEditedBy ID del empleado que realiza el cambio.
 * @param {string|null} params.supplierReference Código de referencia o null.
 * @param {number} params.primaryContactPersonID ID del contacto principal.
 * @param {number} params.alternateContactPersonID ID del contacto alternativo.
 * @param {number} params.deliveryMethodID ID del método de entrega.
 * @param {number} params.paymentDays Plazo de pago en días.
 * @param {string} params.phoneNumber Número telefónico del proveedor.
 * @param {string|null} params.faxNumber Número de fax o null.
 * @param {string|null} params.websiteURL URL del sitio web o null.
 * @param {string|null} params.bankAccountName Nombre de la cuenta bancaria o null.
 * @param {string|null} params.bankAccountBranch Sucursal bancaria o null.
 * @param {string|null} params.bankAccountCode Código de la cuenta bancaria o null.
 * @param {string|null} params.bankAccountNumber Número de cuenta bancaria o null.
 * @param {string|null} params.bankInternationalCode Código bancario internacional o null.
 * @param {string} params.deliveryAddressLine1 Primera línea de la dirección de entrega.
 * @param {string|null} params.deliveryAddressLine2 Segunda línea de la dirección de entrega o null.
 * @param {number} params.deliveryCityID ID compartido de la ciudad de entrega y postal.
 * @param {string} params.deliveryPostalCode Código postal compartido para ambas direcciones.
 * @param {string} params.postalAddressLine1 Primera línea de la dirección postal.
 * @param {string|null} params.postalAddressLine2 Segunda línea de la dirección postal o null.
 * @param {string|null} params.internalComments Comentarios internos o null.
 * @param {number|null} params.latitude Latitud o null.
 * @param {number|null} params.longitude Longitud o null.
 * @returns {Promise<void>} Finaliza cuando el procedimiento actualiza el proveedor.
 */
export async function updateSupplier(supplierID, params) {
    const connection = (await getPool()).request()
    connection.input('SupplierID', sql.Int, supplierID)
    connection.input('SupplierName', sql.NVarChar, params.supplierName)
    connection.input('SupplierCategoryID', sql.Int, params.supplierCategoryID)
    connection.input('LastEditedBy', sql.Int, params.lastEditedBy)
    connection.input('SupplierReference', sql.NVarChar, params.supplierReference ?? null)
    connection.input('PrimaryContactPersonID', sql.Int, params.primaryContactPersonID)
    connection.input('AlternateContactPersonID', sql.Int, params.alternateContactPersonID)
    connection.input('DeliveryMethodID', sql.Int, params.deliveryMethodID)
    connection.input('PaymentDays', sql.Int, params.paymentDays)
    connection.input('PhoneNumber', sql.NVarChar, params.phoneNumber)
    connection.input('FaxNumber', sql.NVarChar, params.faxNumber ?? null)
    connection.input('WebsiteURL', sql.NVarChar, params.websiteURL ?? null)
    connection.input('BankAccountName', sql.NVarChar, params.bankAccountName ?? null)
    connection.input('BankAccountBranch', sql.NVarChar, params.bankAccountBranch ?? null)
    connection.input('BankAccountCode', sql.NVarChar, params.bankAccountCode ?? null)
    connection.input('BankAccountNumber', sql.NVarChar, params.bankAccountNumber ?? null)
    connection.input('BankInternationalCode', sql.NVarChar, params.bankInternationalCode ?? null)
    connection.input('DeliveryAddressLine1', sql.NVarChar, params.deliveryAddressLine1)
    connection.input('DeliveryAddressLine2', sql.NVarChar, params.deliveryAddressLine2 ?? null)
    connection.input('DeliveryCityID', sql.Int, params.deliveryCityID)
    connection.input('DeliveryPostalCode', sql.NVarChar, params.deliveryPostalCode)
    connection.input('PostalAddressLine1', sql.NVarChar, params.postalAddressLine1)
    connection.input('PostalAddressLine2', sql.NVarChar, params.postalAddressLine2 ?? null)
    connection.input('InternalComments', sql.NVarChar(sql.MAX), params.internalComments ?? null)
    connection.input('Latitude', sql.Float, params.latitude ?? null)
    connection.input('Longitude', sql.Float, params.longitude ?? null)
    await connection.execute('Purchasing.UpdateSupplier')
}

/**
 * Elimina un proveedor mediante Purchasing.DeleteSupplier.
 * Lanza 52001 si no existe y 52002 si tiene registros asociados.
 *
 * @param {number} supplierID Identificador del proveedor que se eliminará.
 * @returns {Promise<object>} Resultado del procedimiento almacenado.
 */
export async function deleteSupplier(supplierID) {
    const connection = (await getPool()).request()
    connection.input('SupplierID', sql.Int, supplierID)
    const result = await connection.execute('Purchasing.DeleteSupplier')
    return result
}
