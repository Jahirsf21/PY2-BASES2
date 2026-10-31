import {getPool} from '../config/database.js'
import sql from "mssql"

/**
 * Obtiene una página de clientes junto con el total de registros.
 * Permite filtrar opcionalmente por nombre de cliente, categoría y método de entrega.
 *
 * @param {string|null} customerName Nombre del cliente (búsqueda parcial) o null para no filtrar.
 * @param {number|null} customerCategoryID ID de la categoría del cliente o null para no filtrar.
 * @param {number|null} deliveryMethodID ID del método de entrega o null para no filtrar.
 * @param {number} pageNumber Número de página solicitado.
 * @param {number} pageSize Cantidad de clientes por página.
 * @returns {Promise<{totalCount: number, data: object[]}>} Total de registros y clientes de la página.
 */
export async function getCustomers(customerName, customerCategoryID, deliveryMethodID, pageNumber, pageSize) {
    const connection = (await getPool()).request()
    connection.input('CustomerName', sql.NVarChar, customerName)
    connection.input('CustomerCategoryID', sql.Int, customerCategoryID)
    connection.input('DeliveryMethodID', sql.Int, deliveryMethodID)
    connection.input('PageNumber', sql.Int, pageNumber)
    connection.input('PageSize', sql.Int, pageSize)
    connection.output('TotalCount', sql.Int)
    const result = await connection.execute('Sales.GetCustomers')
    return {
        totalCount: result.output.TotalCount,
        data: result.recordset
    }
}

/**
 * Obtiene una página de clientes (ID y nombre) para usar como "cliente por facturar" (BillToCustomerID).
 * Permite filtrar opcionalmente por nombre de cliente.
 *
 * @param {string|null} customerName Nombre del cliente (búsqueda parcial) o null para no filtrar.
 * @param {number} pageNumber Número de página solicitado.
 * @param {number} pageSize Cantidad de clientes por página.
 * @returns {Promise<{totalCount: number, data: object[]}>} Total de registros y clientes de la página.
 */
export async function getBillToCustomers(customerName, pageNumber, pageSize) {
    const connection = (await getPool()).request()
    connection.input('CustomerName', sql.NVarChar, customerName)
    connection.input('PageNumber', sql.Int, pageNumber)
    connection.input('PageSize', sql.Int, pageSize)
    connection.output('TotalCount', sql.Int)
    const result = await connection.execute('Sales.GetBillToCustomers')
    return {
        totalCount: result.output.TotalCount,
        data: result.recordset
    }
}

/**
 * Obtiene el detalle general de un cliente por su identificador.
 * Incluye nombre, categoría, grupo de compra, nombre del cliente por facturar,
 * método de entrega, días de gracia y sitio web.
 *
 * @param {number} customerID Identificador del cliente.
 * @returns {Promise<object[]>} Datos del cliente en una fila, o un arreglo vacío si no existe.
 */
export async function getCustomerDetail(customerID) {
    const connection = (await getPool()).request()
    connection.input('CustomerID', sql.Int, customerID)
    const result = await connection.execute('Sales.GetCustomerDetail')
    return result.recordset
}

/**
 * Obtiene los valores editables y nombres de referencia de un cliente.
 * La ciudad y el código postal son compartidos por las direcciones de entrega y postal.
 *
 * @param {number} customerID Identificador del cliente.
 * @returns {Promise<object[]>} Datos para precargar el formulario, o un arreglo vacío si no existe.
 */
export async function getCustomerForEdit(customerID) {
    const connection = (await getPool()).request()
    connection.input('CustomerID', sql.Int, customerID)
    const result = await connection.execute('Sales.GetCustomerForEdit')
    return result.recordset
}

/**
 * Obtiene los contactos (principal y alternativo) de un cliente por su identificador.
 * Devuelve nombre, teléfono, fax y correo de ambos contactos en una sola fila.
 *
 * @param {number} customerID Identificador del cliente.
 * @returns {Promise<object[]>} Datos de los contactos en una fila, o un arreglo vacío si no existe.
 */
export async function getCustomerContacts(customerID) {
    const connection = (await getPool()).request()
    connection.input('CustomerID', sql.Int, customerID)
    const result = await connection.execute('Sales.GetCustomerContacts')
    return result.recordset
}

/**
 * Obtiene las direcciones de entrega y postal de un cliente,
 * junto con su ubicación geográfica (latitud/longitud).
 *
 * @param {number} customerID Identificador del cliente.
 * @returns {Promise<object[]>} Direcciones y coordenadas en una fila, o un arreglo vacío si no existe.
 */
export async function getCustomerAddress(customerID) {
    const connection = (await getPool()).request()
    connection.input('CustomerID', sql.Int, customerID)
    const result = await connection.execute('Sales.GetCustomerAddress')
    return result.recordset
}

/**
 * Obtiene todas las categorías de cliente ordenadas por su identificador.
 * Se usa para llenar el combo de filtros de la lista de clientes.
 *
 * @returns {Promise<object[]>} Listado de categorías de cliente.
 */
export async function getCustomerCategories() {
    const connection = (await getPool()).request()
    const result = await connection.execute('Sales.GetCustomerCategories')
    return result.recordset
}

/**
 * Obtiene todas las agrupaciones de compra (buying groups) ordenadas por su identificador.
 * Se usa para llenar el combo de buying group en el formulario de cliente.
 *
 * @returns {Promise<object[]>} Listado de buying groups.
 */
export async function getBuyingGroups() {
    const connection = (await getPool()).request()
    const result = await connection.execute('Sales.GetBuyingGroups')
    return result.recordset
}

/**
 * Inserta un cliente mediante Sales.InsertCustomer y devuelve su identificador.
 * El procedimiento lanza el error 51002 si lastEditedBy no corresponde
 * a un empleado válido.
 * Si billToCustomerID es null, el cliente se factura a sí mismo.
 * La ciudad y el código postal de entrega se guardan también como datos postales.
 *
 * @param {string} customerName Nombre del cliente.
 * @param {number} customerCategoryID ID de la categoría del cliente.
 * @param {number|null} billToCustomerID ID del cliente al que se factura o null para facturarse a sí mismo.
 * @param {number} lastEditedBy ID del empleado que registra el cliente.
 * @param {number} standardDiscountPercentage Porcentaje de descuento estándar.
 * @param {number|null} creditLimit Límite de crédito o null si no aplica.
 * @param {boolean} isStatementSent Indica si se envían estados de cuenta.
 * @param {boolean} isOnCreditHold Indica si el crédito está suspendido.
 * @param {number|null} buyingGroupID ID del grupo de compra o null.
 * @param {number} primaryContactPersonID ID del contacto principal.
 * @param {number|null} alternateContactPersonID ID del contacto alternativo o null.
 * @param {number} deliveryMethodID ID del método de entrega.
 * @param {number} paymentDays Plazo de pago en días.
 * @param {string} phoneNumber Número telefónico del cliente.
 * @param {string|null} faxNumber Número de fax o null.
 * @param {string|null} websiteURL URL del sitio web o null.
 * @param {string} deliveryAddressLine1 Primera línea de la dirección de entrega.
 * @param {string|null} deliveryAddressLine2 Segunda línea de la dirección de entrega o null.
 * @param {number} deliveryCityID ID compartido de la ciudad de entrega y postal.
 * @param {string} deliveryPostalCode Código postal compartido para ambas direcciones.
 * @param {string} postalAddressLine1 Primera línea de la dirección postal.
 * @param {string|null} postalAddressLine2 Segunda línea de la dirección postal o null.
 * @param {number|null} latitude Latitud de entrega o null.
 * @param {number|null} longitude Longitud de entrega o null.
 * @returns {Promise<number>} Identificador del nuevo cliente.
 */
export async function insertCustomer(customerName, customerCategoryID, billToCustomerID, lastEditedBy, standardDiscountPercentage, creditLimit, isStatementSent, isOnCreditHold, buyingGroupID, primaryContactPersonID, alternateContactPersonID, deliveryMethodID, paymentDays, phoneNumber, faxNumber, websiteURL, deliveryAddressLine1, deliveryAddressLine2, deliveryCityID, deliveryPostalCode, postalAddressLine1, postalAddressLine2, latitude, longitude) {
    const connection = (await getPool()).request()
    connection.input('CustomerName', sql.NVarChar, customerName)
    connection.input('CustomerCategoryID', sql.Int, customerCategoryID)
    connection.input('BillToCustomerID', sql.Int, billToCustomerID)
    connection.input('LastEditedBy', sql.Int, lastEditedBy)
    connection.input('StandardDiscountPercentage', sql.Decimal(18, 3), standardDiscountPercentage)
    connection.input('CreditLimit', sql.Decimal(18,2), creditLimit)
    connection.input('IsStatementSent', sql.Bit, isStatementSent)
    connection.input('IsOnCreditHold', sql.Bit, isOnCreditHold)
    connection.input('BuyingGroupID', sql.Int, buyingGroupID)
    connection.input('PrimaryContactPersonID', sql.Int, primaryContactPersonID)
    connection.input('AlternateContactPersonID', sql.Int, alternateContactPersonID)
    connection.input('DeliveryMethodID', sql.Int, deliveryMethodID)
    connection.input('PaymentDays', sql.Int, paymentDays)
    connection.input('PhoneNumber', sql.NVarChar, phoneNumber)
    connection.input('FaxNumber', sql.NVarChar, faxNumber)
    connection.input('WebsiteURL', sql.NVarChar, websiteURL)
    connection.input('DeliveryAddressLine1', sql.NVarChar, deliveryAddressLine1)
    connection.input('DeliveryAddressLine2', sql.NVarChar, deliveryAddressLine2)
    connection.input('DeliveryCityID', sql.Int, deliveryCityID)
    connection.input('DeliveryPostalCode', sql.NVarChar, deliveryPostalCode)
    connection.input('PostalAddressLine1', sql.NVarChar, postalAddressLine1)
    connection.input('PostalAddressLine2', sql.NVarChar, postalAddressLine2)
    connection.input('Latitude', sql.Float, latitude)
    connection.input('Longitude', sql.Float, longitude)
    connection.output('NewCustomerID', sql.Int)
    const result = await connection.execute('Sales.InsertCustomer')
    return result.output.NewCustomerID
}

/**
 * Elimina un cliente mediante Sales.DeleteCustomer.
 * El procedimiento lanza el error 51000 si el cliente no existe y 51001
 * si tiene registros asociados que impiden eliminarlo.
 *
 * @param {number} customerID Identificador del cliente que se eliminará.
 * @returns {Promise<object>} Resultado de ejecutar el procedimiento almacenado.
 */
export async function deleteCustomer(customerID) {
    const connection = (await getPool()).request()
    connection.input('CustomerID', sql.Int, customerID)
    const result = await connection.execute('Sales.DeleteCustomer')
    return result
}

/**
 * Actualiza un cliente mediante Sales.UpdateCustomer.
 * Lanza 51000 si el cliente no existe y 51002 si lastEditedBy no es un empleado válido.
 * AccountOpenedDate no se modifica; la ciudad y el código postal de entrega
 * también actualizan los datos postales.
 *
 * @param {number} customerID Identificador del cliente a actualizar.
 * @param {string} customerName Nombre del cliente.
 * @param {number} customerCategoryID ID de la categoría.
 * @param {number} billToCustomerID ID del cliente al que se factura.
 * @param {number} lastEditedBy ID del empleado que realiza el cambio.
 * @param {number} standardDiscountPercentage Porcentaje de descuento.
 * @param {number|null} creditLimit Límite de crédito o null.
 * @param {boolean} isStatementSent Indica si se envían estados de cuenta.
 * @param {boolean} isOnCreditHold Indica si el crédito está suspendido.
 * @param {number|null} buyingGroupID ID del grupo de compra o null.
 * @param {number} primaryContactPersonID ID del contacto principal.
 * @param {number|null} alternateContactPersonID ID del contacto alternativo o null.
 * @param {number} deliveryMethodID ID del método de entrega.
 * @param {number} paymentDays Plazo de pago en días.
 * @param {string} phoneNumber Teléfono del cliente.
 * @param {string|null} faxNumber Fax o null.
 * @param {string|null} websiteURL Sitio web o null.
 * @param {string} deliveryAddressLine1 Primera línea de dirección de entrega.
 * @param {string|null} deliveryAddressLine2 Segunda línea de dirección de entrega o null.
 * @param {number} deliveryCityID ID compartido de la ciudad de entrega y postal.
 * @param {string} deliveryPostalCode Código postal compartido para ambas direcciones.
 * @param {string} postalAddressLine1 Primera línea de dirección postal.
 * @param {string|null} postalAddressLine2 Segunda línea de dirección postal o null.
 * @param {number|null} latitude Latitud o null.
 * @param {number|null} longitude Longitud o null.
 * @returns {Promise<void>} Finaliza cuando el procedimiento actualiza el cliente.
 */
export async function updateCustomer(customerID, customerName, customerCategoryID, billToCustomerID, lastEditedBy, standardDiscountPercentage, creditLimit, isStatementSent, isOnCreditHold, buyingGroupID, primaryContactPersonID, alternateContactPersonID, deliveryMethodID, paymentDays, phoneNumber, faxNumber, websiteURL, deliveryAddressLine1, deliveryAddressLine2, deliveryCityID, deliveryPostalCode, postalAddressLine1, postalAddressLine2, latitude, longitude) {
    const connection = (await getPool()).request()
    connection.input('CustomerID', sql.Int, customerID)
    connection.input('CustomerName', sql.NVarChar, customerName)
    connection.input('CustomerCategoryID', sql.Int, customerCategoryID)
    connection.input('BillToCustomerID', sql.Int, billToCustomerID)
    connection.input('LastEditedBy', sql.Int, lastEditedBy)
    connection.input('StandardDiscountPercentage', sql.Decimal(18, 3), standardDiscountPercentage)
    connection.input('CreditLimit', sql.Decimal(18, 2), creditLimit)
    connection.input('IsStatementSent', sql.Bit, isStatementSent)
    connection.input('IsOnCreditHold', sql.Bit, isOnCreditHold)
    connection.input('BuyingGroupID', sql.Int, buyingGroupID)
    connection.input('PrimaryContactPersonID', sql.Int, primaryContactPersonID)
    connection.input('AlternateContactPersonID', sql.Int, alternateContactPersonID)
    connection.input('DeliveryMethodID', sql.Int, deliveryMethodID)
    connection.input('PaymentDays', sql.Int, paymentDays)
    connection.input('PhoneNumber', sql.NVarChar, phoneNumber)
    connection.input('FaxNumber', sql.NVarChar, faxNumber)
    connection.input('WebsiteURL', sql.NVarChar, websiteURL)
    connection.input('DeliveryAddressLine1', sql.NVarChar, deliveryAddressLine1)
    connection.input('DeliveryAddressLine2', sql.NVarChar, deliveryAddressLine2)
    connection.input('DeliveryCityID', sql.Int, deliveryCityID)
    connection.input('DeliveryPostalCode', sql.NVarChar, deliveryPostalCode)
    connection.input('PostalAddressLine1', sql.NVarChar, postalAddressLine1)
    connection.input('PostalAddressLine2', sql.NVarChar, postalAddressLine2)
    connection.input('Latitude', sql.Float, latitude)
    connection.input('Longitude', sql.Float, longitude)
    await connection.execute('Sales.UpdateCustomer')
}
