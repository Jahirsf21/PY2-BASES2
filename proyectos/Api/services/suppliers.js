import sql from "mssql";
import { executeCorporateProcedure } from "../helpers/corporateQuery.js";
import { executeProcedure } from "../helpers/procedure.js";

/**
 * Obtiene una página de proveedores junto con el total de registros.
 * Permite filtrar opcionalmente por nombre de proveedor, categoría y método de entrega.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {object} filters supplierName (búsqueda parcial), supplierCategoryID y deliveryMethodID opcionales,
 *   con pageNumber y pageSize.
 * @returns {Promise<{totalCount: number, data: object[]}>} Total de registros y proveedores de la página.
 */
export async function getSuppliers(session, filters) {
  const result = await executeProcedure(
    session,
    "Purchasing.GetSuppliers",
    {
      SupplierName: [sql.NVarChar, filters.supplierName],
      SupplierCategoryID: [sql.Int, filters.supplierCategoryID],
      DeliveryMethodID: [sql.Int, filters.deliveryMethodID],
      PageNumber: [sql.Int, filters.pageNumber],
      PageSize: [sql.Int, filters.pageSize],
    },
    { TotalCount: sql.Int },
  );
  return { totalCount: result.output.TotalCount, data: result.recordset };
}

/**
 * Obtiene todas las categorías de proveedor ordenadas por su identificador.
 * Se usa para llenar el combo de filtros de la lista de proveedores.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @returns {Promise<object[]>} Listado de categorías de proveedor.
 */
export async function getSupplierCategories(session) {
  return (await executeProcedure(session, "Purchasing.GetSupplierCategories"))
    .recordset;
}

/**
 * Obtiene el detalle general de un proveedor por su identificador.
 * Incluye nombre, categoría, método de entrega y días de gracia.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {number} supplierID Identificador del proveedor.
 * @returns {Promise<object[]>} Datos del proveedor en una fila, o un arreglo vacío si no existe.
 */
export async function getSupplierDetail(session, supplierID) {
  const result = await executeProcedure(
    session,
    "Purchasing.GetSupplierDetail",
    { SupplierID: [sql.Int, supplierID] },
  );
  return result.recordset;
}

/**
 * Obtiene el detalle privado de un proveedor por su identificador.
 * Ejecuta Purchasing.GetSupplierPrivateDetail en la sucursal, que consulta Purchasing.v_SupplierPrivate en Corporativo.
 * Devuelve: SupplierID, CodigoProveedor, Telefono, Fax, SitioWeb, NombreBanco,
 * SucursalBanco, NumeroCuentaBancaria, CodigoSwift.
 * Los contactos y las direcciones se consultan por separado.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {number} supplierID Identificador del proveedor.
 * @returns {Promise<object[]>} Datos privados del proveedor en una fila, o un arreglo vacío si no se encuentran.
 */
export async function getSupplierPrivateDetail(session, supplierID) {
  return executeCorporateProcedure(
    session,
    "Purchasing.GetSupplierPrivateDetail",
    { SupplierID: [sql.Int, supplierID] },
  );
}

/**
 * Obtiene los contactos (principal y alternativo) de un proveedor por su identificador.
 * Devuelve nombre, teléfono, fax y correo de ambos contactos en una sola fila.
 * Los nombres se resuelven localmente; las referencias y los datos de contacto provienen de Corporativo.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {number} supplierID Identificador del proveedor.
 * @returns {Promise<object[]>} Datos de los contactos en una fila, o un arreglo vacío si no existe.
 */
export async function getSupplierContacts(session, supplierID) {
  return executeCorporateProcedure(session, "Purchasing.GetSupplierContacts", {
    SupplierID: [sql.Int, supplierID],
  });
}

/**
 * Obtiene las direcciones de entrega y postal de un proveedor,
 * junto con su ubicación geográfica (latitud/longitud).
 * Consulta los datos privados en Corporativo y resuelve los nombres geográficos en la sucursal.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {number} supplierID Identificador del proveedor.
 * @returns {Promise<object[]>} Direcciones y coordenadas en una fila, o un arreglo vacío si no existe.
 */
export async function getSupplierAddress(session, supplierID) {
  return executeCorporateProcedure(session, "Purchasing.GetSupplierAddress", {
    SupplierID: [sql.Int, supplierID],
  });
}

// /**
//  * Inserta un proveedor mediante Purchasing.InsertSupplier.
//  * Lanza 52003 si lastEditedBy no corresponde a un empleado válido.
//  * Requiere un contacto alternativo.
//  * La ciudad y el código postal de entrega se guardan también como datos postales.
//  *
//  * @param {object} params Datos del proveedor.
//  * @param {string} params.supplierName Nombre del proveedor.
//  * @param {number} params.supplierCategoryID ID de la categoría del proveedor.
//  * @param {number} params.lastEditedBy ID del empleado que registra el proveedor.
//  * @param {string|null} params.supplierReference Código de referencia o null.
//  * @param {number} params.primaryContactPersonID ID del contacto principal.
//  * @param {number} params.alternateContactPersonID ID del contacto alternativo.
//  * @param {number} params.deliveryMethodID ID del método de entrega.
//  * @param {number} params.paymentDays Plazo de pago en días.
//  * @param {string} params.phoneNumber Número telefónico del proveedor.
//  * @param {string|null} params.faxNumber Número de fax o null.
//  * @param {string|null} params.websiteURL URL del sitio web o null.
//  * @param {string|null} params.bankAccountName Nombre de la cuenta bancaria o null.
//  * @param {string|null} params.bankAccountBranch Sucursal bancaria o null.
//  * @param {string|null} params.bankAccountCode Código de la cuenta bancaria o null.
//  * @param {string|null} params.bankAccountNumber Número de cuenta bancaria o null.
//  * @param {string|null} params.bankInternationalCode Código bancario internacional o null.
//  * @param {string} params.deliveryAddressLine1 Primera línea de la dirección de entrega.
//  * @param {string|null} params.deliveryAddressLine2 Segunda línea de la dirección de entrega o null.
//  * @param {number} params.deliveryCityID ID compartido de la ciudad de entrega y postal.
//  * @param {string} params.deliveryPostalCode Código postal compartido para ambas direcciones.
//  * @param {string} params.postalAddressLine1 Primera línea de la dirección postal.
//  * @param {string|null} params.postalAddressLine2 Segunda línea de la dirección postal o null.
//  * @param {string|null} params.internalComments Comentarios internos o null.
//  * @param {number|null} params.latitude Latitud de entrega o null.
//  * @param {number|null} params.longitude Longitud de entrega o null.
//  * @param {number} userID Identificador del usuario autenticado, distinto de params.lastEditedBy.
//  * @param {string} node Sucursal del JWT verificado.
//  * @returns {Promise<number>} Identificador del proveedor creado.
//  */
// export async function insertSupplier(params, userID, node) {
//     const connection = (await getPool(node)).request()
//     connection.input('UserID', sql.Int, userID)
//     connection.input('SupplierName', sql.NVarChar, params.supplierName)
//     connection.input('SupplierCategoryID', sql.Int, params.supplierCategoryID)
//     connection.input('LastEditedBy', sql.Int, params.lastEditedBy)
//     connection.input('SupplierReference', sql.NVarChar, params.supplierReference ?? null)
//     connection.input('PrimaryContactPersonID', sql.Int, params.primaryContactPersonID)
//     connection.input('AlternateContactPersonID', sql.Int, params.alternateContactPersonID)
//     connection.input('DeliveryMethodID', sql.Int, params.deliveryMethodID)
//     connection.input('PaymentDays', sql.Int, params.paymentDays)
//     connection.input('PhoneNumber', sql.NVarChar, params.phoneNumber)
//     connection.input('FaxNumber', sql.NVarChar, params.faxNumber ?? null)
//     connection.input('WebsiteURL', sql.NVarChar, params.websiteURL ?? null)
//     connection.input('BankAccountName', sql.NVarChar, params.bankAccountName ?? null)
//     connection.input('BankAccountBranch', sql.NVarChar, params.bankAccountBranch ?? null)
//     connection.input('BankAccountCode', sql.NVarChar, params.bankAccountCode ?? null)
//     connection.input('BankAccountNumber', sql.NVarChar, params.bankAccountNumber ?? null)
//     connection.input('BankInternationalCode', sql.NVarChar, params.bankInternationalCode ?? null)
//     connection.input('DeliveryAddressLine1', sql.NVarChar, params.deliveryAddressLine1)
//     connection.input('DeliveryAddressLine2', sql.NVarChar, params.deliveryAddressLine2 ?? null)
//     connection.input('DeliveryCityID', sql.Int, params.deliveryCityID)
//     connection.input('DeliveryPostalCode', sql.NVarChar, params.deliveryPostalCode)
//     connection.input('PostalAddressLine1', sql.NVarChar, params.postalAddressLine1)
//     connection.input('PostalAddressLine2', sql.NVarChar, params.postalAddressLine2 ?? null)
//     connection.input('InternalComments', sql.NVarChar(sql.MAX), params.internalComments ?? null)
//     connection.input('Latitude', sql.Float, params.latitude ?? null)
//     connection.input('Longitude', sql.Float, params.longitude ?? null)
//     connection.output('NewSupplierID', sql.Int)
//     const result = await connection.execute('Purchasing.InsertSupplier')
//     return result.output.NewSupplierID
// }
//
// /**
//  * Obtiene los valores editables y nombres de referencia de un proveedor.
//  * La ciudad y el código postal son compartidos por las direcciones de entrega y postal.
//  *
//  * @param {number} supplierID Identificador del proveedor.
//  * @param {number} userID Identificador del usuario autenticado.
//  * @param {string} node Sucursal del JWT verificado.
//  * @returns {Promise<object[]>} Datos para precargar el formulario, o un arreglo vacío si no existe.
//  */
// export async function getSupplierForEdit(supplierID, userID, node) {
//     const connection = (await getPool(node)).request()
//     connection.input('UserID', sql.Int, userID)
//     connection.input('SupplierID', sql.Int, supplierID)
//     const result = await connection.execute('Purchasing.GetSupplierForEdit')
//     return result.recordset
// }
//
// /**
//  * Actualiza un proveedor mediante Purchasing.UpdateSupplier.
//  * Lanza 52000 si no existe y 52003 si lastEditedBy no es un empleado válido.
//  * Requiere un contacto alternativo.
//  * La ciudad y el código postal de entrega también actualizan los datos postales.
//  *
//  * @param {number} supplierID Identificador del proveedor a actualizar.
//  * @param {object} params Datos editables del proveedor.
//  * @param {string} params.supplierName Nombre del proveedor.
//  * @param {number} params.supplierCategoryID ID de la categoría del proveedor.
//  * @param {number} params.lastEditedBy ID del empleado que realiza el cambio.
//  * @param {string|null} params.supplierReference Código de referencia o null.
//  * @param {number} params.primaryContactPersonID ID del contacto principal.
//  * @param {number} params.alternateContactPersonID ID del contacto alternativo.
//  * @param {number} params.deliveryMethodID ID del método de entrega.
//  * @param {number} params.paymentDays Plazo de pago en días.
//  * @param {string} params.phoneNumber Número telefónico del proveedor.
//  * @param {string|null} params.faxNumber Número de fax o null.
//  * @param {string|null} params.websiteURL URL del sitio web o null.
//  * @param {string|null} params.bankAccountName Nombre de la cuenta bancaria o null.
//  * @param {string|null} params.bankAccountBranch Sucursal bancaria o null.
//  * @param {string|null} params.bankAccountCode Código de la cuenta bancaria o null.
//  * @param {string|null} params.bankAccountNumber Número de cuenta bancaria o null.
//  * @param {string|null} params.bankInternationalCode Código bancario internacional o null.
//  * @param {string} params.deliveryAddressLine1 Primera línea de la dirección de entrega.
//  * @param {string|null} params.deliveryAddressLine2 Segunda línea de la dirección de entrega o null.
//  * @param {number} params.deliveryCityID ID compartido de la ciudad de entrega y postal.
//  * @param {string} params.deliveryPostalCode Código postal compartido para ambas direcciones.
//  * @param {string} params.postalAddressLine1 Primera línea de la dirección postal.
//  * @param {string|null} params.postalAddressLine2 Segunda línea de la dirección postal o null.
//  * @param {string|null} params.internalComments Comentarios internos o null.
//  * @param {number|null} params.latitude Latitud o null.
//  * @param {number|null} params.longitude Longitud o null.
//  * @param {number} userID Identificador del usuario autenticado, distinto de params.lastEditedBy.
//  * @param {string} node Sucursal del JWT verificado.
//  * @returns {Promise<void>} Finaliza cuando el procedimiento actualiza el proveedor.
//  */
// export async function updateSupplier(supplierID, params, userID, node) {
//     const connection = (await getPool(node)).request()
//     connection.input('UserID', sql.Int, userID)
//     connection.input('SupplierID', sql.Int, supplierID)
//     connection.input('SupplierName', sql.NVarChar, params.supplierName)
//     connection.input('SupplierCategoryID', sql.Int, params.supplierCategoryID)
//     connection.input('LastEditedBy', sql.Int, params.lastEditedBy)
//     connection.input('SupplierReference', sql.NVarChar, params.supplierReference ?? null)
//     connection.input('PrimaryContactPersonID', sql.Int, params.primaryContactPersonID)
//     connection.input('AlternateContactPersonID', sql.Int, params.alternateContactPersonID)
//     connection.input('DeliveryMethodID', sql.Int, params.deliveryMethodID)
//     connection.input('PaymentDays', sql.Int, params.paymentDays)
//     connection.input('PhoneNumber', sql.NVarChar, params.phoneNumber)
//     connection.input('FaxNumber', sql.NVarChar, params.faxNumber ?? null)
//     connection.input('WebsiteURL', sql.NVarChar, params.websiteURL ?? null)
//     connection.input('BankAccountName', sql.NVarChar, params.bankAccountName ?? null)
//     connection.input('BankAccountBranch', sql.NVarChar, params.bankAccountBranch ?? null)
//     connection.input('BankAccountCode', sql.NVarChar, params.bankAccountCode ?? null)
//     connection.input('BankAccountNumber', sql.NVarChar, params.bankAccountNumber ?? null)
//     connection.input('BankInternationalCode', sql.NVarChar, params.bankInternationalCode ?? null)
//     connection.input('DeliveryAddressLine1', sql.NVarChar, params.deliveryAddressLine1)
//     connection.input('DeliveryAddressLine2', sql.NVarChar, params.deliveryAddressLine2 ?? null)
//     connection.input('DeliveryCityID', sql.Int, params.deliveryCityID)
//     connection.input('DeliveryPostalCode', sql.NVarChar, params.deliveryPostalCode)
//     connection.input('PostalAddressLine1', sql.NVarChar, params.postalAddressLine1)
//     connection.input('PostalAddressLine2', sql.NVarChar, params.postalAddressLine2 ?? null)
//     connection.input('InternalComments', sql.NVarChar(sql.MAX), params.internalComments ?? null)
//     connection.input('Latitude', sql.Float, params.latitude ?? null)
//     connection.input('Longitude', sql.Float, params.longitude ?? null)
//     await connection.execute('Purchasing.UpdateSupplier')
// }
//
// /**
//  * Elimina un proveedor mediante Purchasing.DeleteSupplier.
//  * Lanza 52001 si no existe y 52002 si tiene registros asociados.
//  *
//  * @param {number} supplierID Identificador del proveedor que se eliminará.
//  * @param {number} userID Identificador del usuario autenticado.
//  * @param {string} node Sucursal del JWT verificado.
//  * @returns {Promise<object>} Resultado del procedimiento almacenado.
//  */
// export async function deleteSupplier(supplierID, userID, node) {
//     const connection = (await getPool(node)).request()
//     connection.input('UserID', sql.Int, userID)
//     connection.input('SupplierID', sql.Int, supplierID)
//     const result = await connection.execute('Purchasing.DeleteSupplier')
//     return result
// }
