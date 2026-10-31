import {getPool} from '../config/database.js'
import sql from "mssql"

/**
 * Obtiene los años distintos en los que se registraron órdenes de compra.
 * Se usa para llenar los filtros de años de los reportes de compras.
 *
 * @returns {Promise<object[]>} Listado de años con la columna Año.
 */
export async function getPurchaseYears() {
    const connection = (await getPool()).request()
    const result = await connection.execute('Purchasing.GetPurchaseYears')
    return result.recordset
}

/**
 * Obtiene los años distintos en los que se registraron facturas.
 * Se usa para llenar los filtros de años de los reportes de ventas.
 *
 * @returns {Promise<object[]>} Listado de años con la columna Año.
 */
export async function getInvoiceYears() {
    const connection = (await getPool()).request()
    const result = await connection.execute('Sales.GetInvoiceYears')
    return result.recordset
}

/**
 * Obtiene los montos máximo, mínimo y promedio de las órdenes de compra por proveedor.
 * Permite filtrar por nombre del proveedor y nombre de categoría e incluye un resumen general.
 *
 * @param {string|null} supplierName Nombre del proveedor (búsqueda parcial) o null para no filtrar.
 * @param {string|null} supplierCategoryName Nombre de la categoría del proveedor (búsqueda parcial) o null para no filtrar.
 * @returns {Promise<object[]>} Resumen de compras por proveedor y resumen general.
 */
export async function getSupplierPurchaseSummary(supplierName, supplierCategoryName) {
    const connection = (await getPool()).request()
    connection.input('SupplierName', sql.NVarChar, supplierName)
    connection.input('SupplierCategoryName', sql.NVarChar, supplierCategoryName)
    const result = await connection.execute('Purchasing.GetSupplierPurchaseSummary')
    return result.recordset
}

/**
 * Obtiene una página del resumen de montos facturados por cliente y categoría.
 * Permite filtrar por nombre del cliente y nombre de categoría e incluye un resumen general.
 *
 * @param {string|null} customerName Nombre del cliente (búsqueda parcial) o null para no filtrar.
 * @param {string|null} customerCategoryName Nombre de la categoría del cliente (búsqueda parcial) o null para no filtrar.
 * @param {number} pageNumber Número de página solicitado.
 * @param {number} pageSize Cantidad de registros por página.
 * @returns {Promise<{totalCount: number, data: object[]}>} Total de registros y resumen de la página.
 */
export async function getCustomerSalesSummary(customerName, customerCategoryName, pageNumber, pageSize) {
    const connection = (await getPool()).request()
    connection.input('CustomerName', sql.NVarChar, customerName)
    connection.input('CustomerCategoryName', sql.NVarChar, customerCategoryName)
    connection.input('PageNumber', sql.Int, pageNumber)
    connection.input('PageSize', sql.Int, pageSize)
    connection.output('TotalCount', sql.Int)
    const result = await connection.execute('Sales.GetCustomerSalesSummary')
    return {
        totalCount: result.output.TotalCount,
        data: result.recordset
    }
}

/**
 * Obtiene los clientes en los primeros cinco puestos por cantidad de facturas de cada año.
 * Incluye empates y permite limitar el rango de años.
 *
 * @param {number|null} invoiceYearFrom Año inicial (inclusive) o null para no limitar.
 * @param {number|null} invoiceYearTo Año final (inclusive) o null para no limitar.
 * @returns {Promise<object[]>} Clientes, cantidad de facturas, monto facturado y puesto por año.
 */
export async function getTopCustomersByYear(invoiceYearFrom, invoiceYearTo) {
    const connection = (await getPool()).request()
    connection.input('InvoiceYearFrom', sql.Int, invoiceYearFrom)
    connection.input('InvoiceYearTo', sql.Int, invoiceYearTo)
    const result = await connection.execute('Sales.GetTopCustomersByYear')
    return result.recordset
}

/**
 * Obtiene los productos en los primeros cinco puestos por ganancia acumulada de cada año.
 * Incluye empates y permite filtrar por un año de facturación.
 *
 * @param {number|null} year Año de las facturas o null para consultar todos los años.
 * @returns {Promise<object[]>} Año, producto, ganancia acumulada y puesto del ranking.
 */
export async function getTopProductsByYear(year) {
    const connection = (await getPool()).request()
    connection.input('Year', sql.Int, year)
    const result = await connection.execute('Warehouse.GetTopProductsByYear')
    return result.recordset
}

/**
 * Obtiene los proveedores en los primeros cinco puestos por cantidad de compras de cada año.
 * Incluye empates y permite limitar el rango de años.
 *
 * @param {number|null} orderYearFrom Año inicial (inclusive) o null para no limitar.
 * @param {number|null} orderYearTo Año final (inclusive) o null para no limitar.
 * @returns {Promise<object[]>} Proveedores, cantidad de compras, monto comprado y puesto por año.
 */
export async function getTopSuppliersByYear(orderYearFrom, orderYearTo) {
    const connection = (await getPool()).request()
    connection.input('OrderYearFrom', sql.Int, orderYearFrom)
    connection.input('OrderYearTo', sql.Int, orderYearTo)
    const result = await connection.execute('Purchasing.GetTopSuppliersByYear')
    return result.recordset
}

/**
 * Obtiene el monto facturado por año y grupo de productos, con cada grupo como columna.
 *
 * @returns {Promise<object[]>} Montos por grupo de productos ordenados por año.
 */
export async function getProductCategorySalesByYear() {
    const connection = (await getPool()).request()
    const result = await connection.execute('Sales.GetProductCategorySalesByYear')
    return result.recordset
}

/**
 * Obtiene una página del seguimiento de ventas por cliente, año y mes.
 * Permite filtrar por una lista JSON de categorías de productos e incluye sus nombres.
 * Cuando se indican categorías, suma las líneas cuyos productos pertenecen a todas ellas.
 * Incluye montos de la primera y última factura y cantidades total, máxima y mínima del mes.
 * Las cantidades se suman por factura antes del resumen mensual.
 *
 * @param {number|null} year Año de las facturas o null para no filtrar.
 * @param {number|null} month Mes de las facturas (1 a 12) o null para no filtrar.
 * @param {string|null} stockGroupIDsJson Arreglo JSON de IDs de categorías, como '[1,3,5]'; null o '[]' para consultar todas.
 * @param {number} pageNumber Número de página solicitado.
 * @param {number} pageSize Cantidad de registros por página.
 * @returns {Promise<{totalCount: number, data: object[]}>} Total de grupos cliente/año/mes y seguimiento de la página.
 */
export async function getCustomerSalesTracking(year, month, stockGroupIDsJson, pageNumber, pageSize) {
    const connection = (await getPool()).request()
    connection.input('Year', sql.Int, year)
    connection.input('Month', sql.Int, month)
    connection.input('StockGroupIDsJson', sql.NVarChar(sql.MAX), stockGroupIDsJson)
    connection.input('PageNumber', sql.Int, pageNumber)
    connection.input('PageSize', sql.Int, pageSize)
    connection.output('TotalCount', sql.Int)
    const result = await connection.execute('Sales.GetCustomerSalesTracking')
    return {
        totalCount: result.output.TotalCount,
        data: result.recordset
    }
}

/**
 * Obtiene una página del seguimiento de compras por proveedor, año y mes.
 * Permite filtrar por una lista JSON de categorías de productos e incluye sus nombres.
 * Cuando se indican categorías, suma las líneas cuyos productos pertenecen a todas ellas.
 * Incluye montos de la primera y última compra y cantidades total, máxima y mínima del mes.
 * Las cantidades se suman por orden y se expresan en empaques.
 * El procedimiento aplica los filtros al conteo de grupos y a los resultados.
 *
 * @param {number|null} year Año de las compras o null para no filtrar.
 * @param {number|null} month Mes de las compras (1 a 12) o null para no filtrar.
 * @param {string|null} stockGroupIDsJson Arreglo JSON de IDs de categorías, como '[1,3,5]'; null o '[]' para consultar todas.
 * @param {number} pageNumber Número de página solicitado.
 * @param {number} pageSize Cantidad de registros por página.
 * @returns {Promise<{totalCount: number, data: object[]}>} Total de grupos proveedor/año/mes filtrados y seguimiento de la página.
 */
export async function getSupplierPurchaseTracking(year, month, stockGroupIDsJson, pageNumber, pageSize) {
    const connection = (await getPool()).request()
    connection.input('Year', sql.Int, year)
    connection.input('Month', sql.Int, month)
    connection.input('StockGroupIDsJson', sql.NVarChar(sql.MAX), stockGroupIDsJson)
    connection.input('PageNumber', sql.Int, pageNumber)
    connection.input('PageSize', sql.Int, pageSize)
    connection.output('TotalCount', sql.Int)
    const result = await connection.execute('Purchasing.GetSupplierPurchaseTracking')
    return {
        totalCount: result.output.TotalCount,
        data: result.recordset
    }
}
