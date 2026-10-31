import {getPool} from '../config/database.js'
import sql from "mssql"

/**
 * Obtiene una página de facturas junto con el total de registros.
 * Permite filtrar opcionalmente por número de factura, rango de fechas, nombre de cliente,
 * método de entrega y rango de monto facturado.
 *
 * @param {number|null} invoiceID Número de factura o null para no filtrar.
 * @param {string|null} invoiceDateFrom Fecha desde (YYYY-MM-DD) o null para no filtrar.
 * @param {string|null} invoiceDateTo Fecha hasta (YYYY-MM-DD) o null para no filtrar.
 * @param {string|null} customerName Nombre del cliente (búsqueda parcial) o null para no filtrar.
 * @param {number|null} deliveryMethodID ID del método de entrega o null para no filtrar.
 * @param {number|null} minInvoiceAmount Monto mínimo o null para no filtrar.
 * @param {number|null} maxInvoiceAmount Monto máximo o null para no filtrar.
 * @param {number} pageNumber Número de página solicitado.
 * @param {number} pageSize Cantidad de facturas por página.
 * @returns {Promise<{totalCount: number, data: object[]}>} Total de registros y facturas de la página.
 */
export async function getInvoices(invoiceID, invoiceDateFrom, invoiceDateTo, customerName, deliveryMethodID, minInvoiceAmount, maxInvoiceAmount, pageNumber, pageSize) {
    const connection = (await getPool()).request()
    connection.input('InvoiceID', sql.Int, invoiceID)
    connection.input('InvoiceDateFrom', sql.Date, invoiceDateFrom)
    connection.input('InvoiceDateTo', sql.Date, invoiceDateTo)
    connection.input('CustomerName', sql.NVarChar, customerName)
    connection.input('DeliveryMethodID', sql.Int, deliveryMethodID)
    connection.input('MinInvoiceAmount', sql.Decimal(18, 2), minInvoiceAmount)
    connection.input('MaxInvoiceAmount', sql.Decimal(18, 2), maxInvoiceAmount)
    connection.input('PageNumber', sql.Int, pageNumber)
    connection.input('PageSize', sql.Int, pageSize)
    connection.output('TotalCount', sql.Int)
    const result = await connection.execute('Sales.GetInvoices')
    return {
        totalCount: result.output.TotalCount,
        data: result.recordset
    }
}

/**
 * Obtiene el encabezado de una factura.
 *
 * @param {number} invoiceID Identificador de la factura.
 * @returns {Promise<object[]>} Encabezado en una fila o un arreglo vacío.
 */
export async function getInvoiceHeader(invoiceID) {
    const connection = (await getPool()).request()
    connection.input('InvoiceID', sql.Int, invoiceID)
    const result = await connection.execute('Sales.GetInvoiceHeader')
    return result.recordset
}

/**
 * Obtiene los campos editables del encabezado de una factura.
 *
 * @param {number} invoiceID Identificador de la factura.
 * @returns {Promise<object[]>} Datos para precargar el formulario.
 */
export async function getInvoiceForEdit(invoiceID) {
    const connection = (await getPool()).request()
    connection.input('InvoiceID', sql.Int, invoiceID)
    const result = await connection.execute('Sales.GetInvoiceForEdit')
    return result.recordset
}

/**
 * Obtiene las líneas de productos de una factura.
 *
 * @param {number} invoiceID Identificador de la factura.
 * @returns {Promise<object[]>} Líneas ordenadas por identificador.
 */
export async function getInvoiceLines(invoiceID) {
    const connection = (await getPool()).request()
    connection.input('InvoiceID', sql.Int, invoiceID)
    const result = await connection.execute('Sales.GetInvoiceLines')
    return result.recordset
}

/**
 * Inserta una factura con sus líneas de detalle.
 *
 * @param {object} invoice Encabezado y líneas.
 * @returns {Promise<number>} Identificador de la factura creada.
 */
export async function insertInvoice(invoice) {
    const connection = (await getPool()).request()
    connection.input('CustomerID', sql.Int, invoice.customerID)
    connection.input('BillToCustomerID', sql.Int, invoice.billToCustomerID ?? null)
    connection.input('DeliveryMethodID', sql.Int, invoice.deliveryMethodID)
    connection.input('ContactPersonID', sql.Int, invoice.contactPersonID)
    connection.input('AccountsPersonID', sql.Int, invoice.accountsPersonID)
    connection.input('PackedByPersonID', sql.Int, invoice.packedByPersonID)
    connection.input('LastEditedBy', sql.Int, invoice.lastEditedBy)
    connection.input('SalespersonPersonID', sql.Int, invoice.salespersonPersonID ?? null)
    connection.input('CustomerPurchaseOrderNumber', sql.NVarChar, invoice.customerPurchaseOrderNumber ?? null)
    connection.input('InvoiceDate', sql.Date, invoice.invoiceDate)
    connection.input('DeliveryInstructions', sql.NVarChar, invoice.deliveryInstructions ?? null)
    connection.input('LinesJson', sql.NVarChar(sql.MAX), JSON.stringify(invoice.lines.map((line) => ({
        StockItemID: line.stockItemID,
        Quantity: line.quantity,
        UnitPrice: line.unitPrice,
    }))))
    connection.output('NewInvoiceID', sql.Int)
    const result = await connection.execute('Sales.InsertInvoice')
    return result.output.NewInvoiceID
}

/**
 * Actualiza una factura y reemplaza sus líneas de detalle.
 *
 * @param {number} invoiceID Identificador de la factura.
 * @param {object} invoice Datos actualizados.
 * @returns {Promise<void>} Finaliza al actualizar la factura.
 */
export async function updateInvoice(invoiceID, invoice) {
    const connection = (await getPool()).request()
    connection.input('InvoiceID', sql.Int, invoiceID)
    connection.input('CustomerID', sql.Int, invoice.customerID)
    connection.input('BillToCustomerID', sql.Int, invoice.billToCustomerID ?? null)
    connection.input('DeliveryMethodID', sql.Int, invoice.deliveryMethodID)
    connection.input('ContactPersonID', sql.Int, invoice.contactPersonID)
    connection.input('AccountsPersonID', sql.Int, invoice.accountsPersonID)
    connection.input('PackedByPersonID', sql.Int, invoice.packedByPersonID)
    connection.input('LastEditedBy', sql.Int, invoice.lastEditedBy)
    connection.input('SalespersonPersonID', sql.Int, invoice.salespersonPersonID ?? null)
    connection.input('CustomerPurchaseOrderNumber', sql.NVarChar, invoice.customerPurchaseOrderNumber ?? null)
    connection.input('InvoiceDate', sql.Date, invoice.invoiceDate)
    connection.input('DeliveryInstructions', sql.NVarChar, invoice.deliveryInstructions ?? null)
    connection.input('LinesJson', sql.NVarChar(sql.MAX), JSON.stringify(invoice.lines.map((line) => ({
        StockItemID: line.stockItemID,
        Quantity: line.quantity,
        UnitPrice: line.unitPrice,
    }))))
    await connection.execute('Sales.UpdateInvoice')
}

