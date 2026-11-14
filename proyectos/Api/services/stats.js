import sql from "mssql";
import { executeProcedure } from "../helpers/procedure.js";

/**
 * Parámetro de sucursal compartido por los reportes.
 *
 * @param {object} filters Filtros validados, con sucursal opcional.
 * @returns {object} Parámetro como { Sucursal: [tipo, valor] }; null para el consolidado.
 */
function sucursalParameter(filters) {
  return { Sucursal: [sql.NVarChar(20), filters.sucursal ?? null] };
}

/**
 * Ejecuta un reporte paginado y devuelve sus filas con el total de registros.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {string} procedure Nombre del procedimiento almacenado.
 * @param {object} params Parámetros del reporte como { Nombre: [tipo, valor] }.
 * @param {object} filters Filtros validados con pageNumber y pageSize.
 * @returns {Promise<{totalCount: number, data: object[]}>} Total de registros y filas de la página.
 */
async function executePagedReport(session, procedure, params, filters) {
  const result = await executeProcedure(
    session,
    procedure,
    {
      ...params,
      PageNumber: [sql.Int, filters.pageNumber],
      PageSize: [sql.Int, filters.pageSize],
    },
    { TotalCount: sql.Int },
  );
  return { totalCount: result.output.TotalCount, data: result.recordset };
}

/**
 * Obtiene los años con órdenes de compra para los filtros de los reportes.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @returns {Promise<object[]>} Listado de años con la columna Año.
 */
export async function getPurchaseYears(session) {
  return (await executeProcedure(session, "Purchasing.GetPurchaseYears"))
    .recordset;
}

/**
 * Obtiene los años con facturas para los filtros de los reportes.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @returns {Promise<object[]>} Listado de años con la columna Año.
 */
export async function getInvoiceYears(session) {
  return (await executeProcedure(session, "Sales.GetInvoiceYears")).recordset;
}

/**
 * Obtiene los montos máximo, mínimo y promedio de las compras por proveedor, con un resumen general.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {object} filters supplierName, supplierCategoryName y sucursal opcionales.
 * @returns {Promise<object[]>} Resumen de compras por proveedor y resumen general.
 */
export async function getSupplierPurchaseSummary(session, filters) {
  const result = await executeProcedure(
    session,
    "Purchasing.GetSupplierPurchaseSummary",
    {
      SupplierName: [sql.NVarChar(100), filters.supplierName ?? null],
      SupplierCategoryName: [
        sql.NVarChar(50),
        filters.supplierCategoryName ?? null,
      ],
      ...sucursalParameter(filters),
    },
  );
  return result.recordset;
}

/**
 * Obtiene una página del resumen de montos facturados por cliente y categoría.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {object} filters customerName, customerCategoryName y sucursal opcionales, con pageNumber y pageSize.
 * @returns {Promise<{totalCount: number, data: object[]}>} Total de registros y resumen de la página.
 */
export async function getCustomerSalesSummary(session, filters) {
  return executePagedReport(
    session,
    "Sales.GetCustomerSalesSummary",
    {
      CustomerName: [sql.NVarChar(100), filters.customerName ?? null],
      CustomerCategoryName: [
        sql.NVarChar(50),
        filters.customerCategoryName ?? null,
      ],
      ...sucursalParameter(filters),
    },
    filters,
  );
}

/**
 * Obtiene los clientes de los primeros cinco puestos por cantidad de facturas de cada año.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {object} filters invoiceYearFrom, invoiceYearTo y sucursal opcionales.
 * @returns {Promise<object[]>} Clientes, cantidad de facturas, monto facturado y puesto por año.
 */
export async function getTopCustomersByYear(session, filters) {
  const result = await executeProcedure(
    session,
    "Sales.GetTopCustomersByYear",
    {
      InvoiceYearFrom: [sql.Int, filters.invoiceYearFrom ?? null],
      InvoiceYearTo: [sql.Int, filters.invoiceYearTo ?? null],
      ...sucursalParameter(filters),
    },
  );
  return result.recordset;
}

/**
 * Obtiene los productos de los primeros cinco puestos por ganancia de cada año.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {object} filters year y sucursal opcionales.
 * @returns {Promise<object[]>} Año, producto, ganancia acumulada y puesto del ranking.
 */
export async function getTopProductsByYear(session, filters) {
  const result = await executeProcedure(
    session,
    "Warehouse.GetTopProductsByYear",
    { Year: [sql.Int, filters.year ?? null], ...sucursalParameter(filters) },
  );
  return result.recordset;
}

/**
 * Obtiene los proveedores de los primeros cinco puestos por cantidad de compras de cada año.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {object} filters orderYearFrom, orderYearTo y sucursal opcionales.
 * @returns {Promise<object[]>} Proveedores, cantidad de compras, monto comprado y puesto por año.
 */
export async function getTopSuppliersByYear(session, filters) {
  const result = await executeProcedure(
    session,
    "Purchasing.GetTopSuppliersByYear",
    {
      OrderYearFrom: [sql.Int, filters.orderYearFrom ?? null],
      OrderYearTo: [sql.Int, filters.orderYearTo ?? null],
      ...sucursalParameter(filters),
    },
  );
  return result.recordset;
}

/**
 * Obtiene por año el monto facturado de cada grupo de productos.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {object} filters sucursal opcional.
 * @returns {Promise<object[]>} Montos por grupo de productos ordenados por año.
 */
export async function getProductCategorySalesByYear(session, filters) {
  const result = await executeProcedure(
    session,
    "Sales.GetProductCategorySalesByYear",
    sucursalParameter(filters),
  );
  return result.recordset;
}

/**
 * Obtiene una página del seguimiento mensual de facturas por cliente.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {object} filters year, month, stockGroupIDsJson y sucursal opcionales, con pageNumber y pageSize.
 * @returns {Promise<{totalCount: number, data: object[]}>} Total de grupos cliente/año/mes y filas de la página.
 */
export async function getCustomerSalesTracking(session, filters) {
  return executePagedReport(
    session,
    "Sales.GetCustomerSalesTracking",
    trackingParameters(filters),
    filters,
  );
}

/**
 * Obtiene una página del seguimiento mensual de órdenes de compra por proveedor.
 *
 * @param {object} session Identidad de req.user, con userID y node.
 * @param {object} filters year, month, stockGroupIDsJson y sucursal opcionales, con pageNumber y pageSize.
 * @returns {Promise<{totalCount: number, data: object[]}>} Total de grupos proveedor/año/mes y filas de la página.
 */
export async function getSupplierPurchaseTracking(session, filters) {
  return executePagedReport(
    session,
    "Purchasing.GetSupplierPurchaseTracking",
    trackingParameters(filters),
    filters,
  );
}

/**
 * Parámetros compartidos por los seguimientos mensuales.
 *
 * @param {object} filters year, month, stockGroupIDsJson y sucursal opcionales.
 * @returns {object} Parámetros como { Nombre: [tipo, valor] }.
 */
function trackingParameters(filters) {
  return {
    Year: [sql.Int, filters.year ?? null],
    Month: [sql.Int, filters.month ?? null],
    StockGroupIDsJson: [
      sql.NVarChar(sql.MAX),
      filters.stockGroupIDsJson ?? null,
    ],
    ...sucursalParameter(filters),
  };
}
