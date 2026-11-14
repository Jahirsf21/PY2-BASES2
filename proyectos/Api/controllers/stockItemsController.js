import { paginatedResponse } from "../helpers/paginatedResponse.js";
import {
  getStockItems,
  getStockGroups,
  getColors,
  getPackageTypes,
  getStockItemDetail,
  getStockItemGroups,
  getCatalogStockItemForEdit,
  insertCatalogStockItem,
  updateCatalogStockItem,
  getStockItemHoldings,
  adjustStockItemHoldings,
  deleteStockItem,
} from "../services/stockItems.js";

/**
 * Obtiene una página de productos de la sucursal.
 * Permite filtrar opcionalmente por nombre de producto y grupos.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP con filtros y paginación en res.locals.
 * @returns {Promise<import('express').Response>} Respuesta JSON con la página de productos.
 */
export async function listStockItems(req, res) {
  const { pageNumber, pageSize } = res.locals.pagination;
  const result = await getStockItems(req.user, {
    ...res.locals.query,
    pageNumber,
    pageSize,
  });
  return paginatedResponse(res, pageNumber, pageSize, result);
}

/**
 * Obtiene todos los grupos de productos.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con los grupos de productos.
 */
export async function listStockGroups(req, res) {
  return res.json(await getStockGroups(req.user));
}

/**
 * Obtiene los colores disponibles para el formulario de productos.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con los colores.
 */
export async function listColors(req, res) {
  return res.json(await getColors(req.user));
}

/**
 * Obtiene los tipos de empaque disponibles para productos.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Respuesta JSON con los tipos de empaque.
 */
export async function listPackageTypes(req, res) {
  return res.json(await getPackageTypes(req.user));
}

/**
 * Obtiene el detalle de un producto en la sucursal.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP con stockItemID en res.locals.params.
 * @returns {Promise<import('express').Response>} Detalle del producto o 404.
 */
export async function getStockItemById(req, res) {
  const items = await getStockItemDetail(
    req.user,
    res.locals.params.stockItemID,
  );
  if (items.length === 0) {
    return res.status(404).json({ message: "Producto no encontrado" });
  }
  return res.json(items);
}

/**
 * Obtiene los grupos asociados a un producto en la sucursal.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP con stockItemID en res.locals.params.
 * @returns {Promise<import('express').Response>} Grupos del producto o 404.
 */
export async function getStockItemGroupsById(req, res) {
  const groups = await getStockItemGroups(
    req.user,
    res.locals.params.stockItemID,
  );
  if (groups.length === 0) {
    return res
      .status(404)
      .json({ message: "Grupos del producto no encontrados" });
  }
  return res.json(groups);
}

/**
 * Obtiene de Corporativo los datos editables del catálogo, sus grupos y su versión.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP con stockItemID en res.locals.params.
 * @returns {Promise<import('express').Response>} Datos del formulario con Grupos y Version, o 404.
 */
export async function getStockItemEditById(req, res) {
  const item = await getCatalogStockItemForEdit(
    req.user,
    res.locals.params.stockItemID,
  );
  if (!item) {
    return res.status(404).json({ message: "Producto no encontrado" });
  }
  return res.json(item);
}

/**
 * Inserta un producto en el catálogo central.
 *
 * @param {import('express').Request} req Petición HTTP con los datos del catálogo en req.body.
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {Promise<import('express').Response>} Identificador y versión del producto creado.
 */
export async function addStockItem(req, res) {
  const created = await insertCatalogStockItem(req.user, req.body);
  return res.status(201).json(created);
}

/**
 * Actualiza un producto del catálogo central con la versión cargada en el formulario.
 *
 * @param {import('express').Request} req Petición HTTP con los datos del catálogo y version en req.body.
 * @param {import('express').Response} res Respuesta HTTP con stockItemID en res.locals.params.
 * @returns {Promise<import('express').Response>} Identificador y nueva versión del producto.
 */
export async function editStockItem(req, res) {
  const { stockItemID } = res.locals.params;
  const version = await updateCatalogStockItem(req.user, stockItemID, req.body);
  return res.json({ stockItemID, version });
}

/**
 * Obtiene las existencias de un producto en la sucursal para ajustarlas.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP con stockItemID en res.locals.params.
 * @returns {Promise<import('express').Response>} Existencias con Version, o 404 si el producto no está en la sucursal.
 */
export async function getStockItemHoldingsById(req, res) {
  const holdings = await getStockItemHoldings(
    req.user,
    res.locals.params.stockItemID,
  );
  if (!holdings) {
    return res.status(404).json({
      message: "El producto todavía no está disponible en esta sucursal",
    });
  }
  return res.json(holdings);
}

/**
 * Guarda los valores absolutos de las existencias de un producto en la sucursal.
 *
 * @param {import('express').Request} req Petición HTTP con las existencias y version en req.body.
 * @param {import('express').Response} res Respuesta HTTP con stockItemID en res.locals.params.
 * @returns {Promise<import('express').Response>} Identificador y nueva versión de las existencias.
 */
export async function adjustStockItemHoldingsById(req, res) {
  const { stockItemID } = res.locals.params;
  const version = await adjustStockItemHoldings(
    req.user,
    stockItemID,
    req.body,
  );
  return res.json({ stockItemID, version });
}

/**
 * Elimina un producto en la sucursal.
 *
 * @param {import('express').Request} req Petición HTTP.
 * @param {import('express').Response} res Respuesta HTTP con stockItemID en res.locals.params.
 * @returns {Promise<import('express').Response>} Respuesta sin contenido al eliminarlo.
 */
export async function removeStockItem(req, res) {
  await deleteStockItem(req.user, res.locals.params.stockItemID);
  return res.status(204).send();
}
