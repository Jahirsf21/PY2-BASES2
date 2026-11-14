import { paginatedResponse } from "../helpers/paginatedResponse.js";
import {
  getPurchaseYears,
  getInvoiceYears,
  getSupplierPurchaseSummary,
  getCustomerSalesSummary,
  getTopCustomersByYear,
  getTopProductsByYear,
  getTopSuppliersByYear,
  getProductCategorySalesByYear,
  getCustomerSalesTracking,
  getSupplierPurchaseTracking,
} from "../services/stats.js";

/**
 * Obtiene los años disponibles para los filtros de los reportes de compras.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con los años de compras.
 */
export async function listPurchaseYears(req, res) {
  return res.json(await getPurchaseYears(req.user));
}

/**
 * Obtiene los años disponibles para los filtros de los reportes de ventas.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con los años de facturación.
 */
export async function listInvoiceYears(req, res) {
  return res.json(await getInvoiceYears(req.user));
}

/**
 * Obtiene el resumen de compras por proveedor y categoría.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP con los filtros en res.locals.query.
 * @returns {Promise<import('express').Response>} Resumen de proveedores y fila de resumen general.
 */
export async function listSupplierPurchaseSummary(req, res) {
  return res.json(await getSupplierPurchaseSummary(req.user, res.locals.query));
}

/**
 * Obtiene una página del resumen de ventas por cliente y categoría.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP con filtros y paginación en res.locals.
 * @returns {Promise<import('express').Response>} Resumen paginado con el total de registros.
 */
export async function listCustomerSalesSummary(req, res) {
  const { pageNumber, pageSize } = res.locals.pagination;
  const result = await getCustomerSalesSummary(req.user, {
    ...res.locals.query,
    pageNumber,
    pageSize,
  });
  return paginatedResponse(res, pageNumber, pageSize, result);
}

/**
 * Obtiene los clientes de los primeros cinco puestos del ranking anual por cantidad de facturas.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP con los filtros en res.locals.query.
 * @returns {Promise<import('express').Response>} Ranking anual de clientes, incluidos los empates.
 */
export async function listTopCustomersByYear(req, res) {
  return res.json(await getTopCustomersByYear(req.user, res.locals.query));
}

/**
 * Obtiene los productos de los primeros cinco puestos del ranking anual por ganancia.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP con los filtros en res.locals.query.
 * @returns {Promise<import('express').Response>} Ranking anual de productos, incluidos los empates.
 */
export async function listTopProductsByYear(req, res) {
  return res.json(await getTopProductsByYear(req.user, res.locals.query));
}

/**
 * Obtiene los proveedores de los primeros cinco puestos del ranking anual por cantidad de compras.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP con los filtros en res.locals.query.
 * @returns {Promise<import('express').Response>} Ranking anual de proveedores, incluidos los empates.
 */
export async function listTopSuppliersByYear(req, res) {
  return res.json(await getTopSuppliersByYear(req.user, res.locals.query));
}

/**
 * Obtiene la matriz de ventas por grupo de productos y año.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP con los filtros en res.locals.query.
 * @returns {Promise<import('express').Response>} Montos por grupo de productos ordenados por año.
 */
export async function listProductCategorySalesByYear(req, res) {
  return res.json(
    await getProductCategorySalesByYear(req.user, res.locals.query),
  );
}

/**
 * Obtiene una página del seguimiento mensual de facturas por cliente.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP con filtros y paginación en res.locals.
 * @returns {Promise<import('express').Response>} Seguimiento paginado con el total de registros.
 */
export async function listCustomerSalesTracking(req, res) {
  const { pageNumber, pageSize } = res.locals.pagination;
  const result = await getCustomerSalesTracking(req.user, {
    ...res.locals.query,
    pageNumber,
    pageSize,
  });
  return paginatedResponse(res, pageNumber, pageSize, result);
}

/**
 * Obtiene una página del seguimiento mensual de órdenes de compra por proveedor.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP con filtros y paginación en res.locals.
 * @returns {Promise<import('express').Response>} Seguimiento paginado con el total de registros.
 */
export async function listSupplierPurchaseTracking(req, res) {
  const { pageNumber, pageSize } = res.locals.pagination;
  const result = await getSupplierPurchaseTracking(req.user, {
    ...res.locals.query,
    pageNumber,
    pageSize,
  });
  return paginatedResponse(res, pageNumber, pageSize, result);
}
